using Microsoft.EntityFrameworkCore;
using SchoolPaymentSystem.Data;
using SchoolPaymentSystem.DTO.Payment;
using SchoolPaymentSystem.DTO.Splitter;
using SchoolPaymentSystem.Exceptions;
using SchoolPaymentSystem.Helpers;
using SchoolPaymentSystem.Models;
using SchoolPaymentSystem.Models.fees;
using SchoolPaymentSystem.Models.payment;
using SchoolPaymentSystem.Services.Interfaces;

namespace SchoolPaymentSystem.Services;

/// <summary>
/// Allocation rules:
///
/// TUITION — sequential (arrears-first):
///   The user selects which months they want to cover. The money is always
///   applied from the earliest unpaid month first (PaymentSplitter). If the
///   student owes April and the user picks May, April is cleared first.
///   The budget given to the splitter is capped at the total outstanding for
///   the selected months so money does not spill into unselected future months.
///
/// ALL OTHER FEES — explicit (user picks exactly what to pay):
///   Transport: per-month, user chooses which month(s) — no sequential rule.
///   Trips, Uniform, Project, Registration, Custom: single selection.
///   Sports Levy, Admission, Report Book: single per-term/year item.
///
/// Allocation order (when money runs short):
///   Admission → Sports Levy → Tuition → Report Book → Custom Fees
///   → Project Fee → Transport (per selected month) → Trips → Uniform
///   → Registration Fee
///
/// Surplus handling:
///   User-directed transfers applied first (SurplusTransfers list).
///   Remaining surplus auto-credits the next unpaid tuition month (sequential).
///   Every transfer is logged in SurplusTransfer table.
/// </summary>
public class PaymentOrchestrator : IPaymentOrchestrator
{
    private readonly ApplicationDbContext _db;
    private readonly IAuditService _audit;
    private readonly ICurrentUser _currentUser;
    private readonly IZigRateService _zigRate;
    private readonly IFeeRuleService _feeRules;
    private readonly IPaymentService _payments;

    public PaymentOrchestrator(
        ApplicationDbContext db, IAuditService audit, ICurrentUser currentUser,
        IZigRateService zigRate, IFeeRuleService feeRules, IPaymentService payments)
    {
        _db = db; _audit = audit; _currentUser = currentUser;
        _zigRate = zigRate; _feeRules = feeRules; _payments = payments;
    }

    public async Task<PaymentDto> ProcessPaymentAsync(CreatePaymentRequest request)
    {
        // ── Validate ──────────────────────────────────────────────────────────
        var student = await _db.Student.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == request.StudentId)
            ?? throw new NotFoundException("Student", request.StudentId);
        if (!student.IsActive)
            throw new BusinessRuleException("Cannot record payment for a deactivated student.");

        var term = await _db.Term.AsNoTracking()
            .Include(t => t.TermMonths.OrderBy(m => m.SortOrder))
            .FirstOrDefaultAsync(t => t.Id == request.TermId)
            ?? throw new NotFoundException("Term", request.TermId);
        if (!term.TermMonths.Any())
            throw new BusinessRuleException("This term has no months configured.");

        var method = await _db.PaymentMethod.FindAsync(request.PaymentMethodId)
            ?? throw new NotFoundException("PaymentMethod", request.PaymentMethodId);
        if (method.RequiresReference && string.IsNullOrWhiteSpace(request.Reference))
            throw new ValidationException("reference", $"{method.Name} payments require a reference number.");
        if (!CurrencyHelper.IsValid(request.Currency))
            throw new ValidationException("currency", "Currency must be 'USD' or 'ZIG'.");
        if (method.Code != "PREPAYMENT" && request.AmountPaid <= 0)
            throw new ValidationException("amountPaid", "Amount paid must be greater than zero.");

        if (method.Code == "PREPAYMENT")
        {
            var nonTuition = request.SelectedItems?.Where(i => i.ItemType != PaymentItemType.Tuition).ToList();
            if (nonTuition?.Any() == true)
                throw new BusinessRuleException("Prepayments are only accepted for tuition fee.");
        }

        var gradeHistory = await _db.StudentGradeHistory.AsNoTracking()
            .Include(h => h.Grade)
            .FirstOrDefaultAsync(h => h.StudentId == request.StudentId && h.AcademicYearId == request.AcademicYearId)
            ?? throw new BusinessRuleException("Student has no grade assignment for this academic year.");

        // termFee is only required for tuition/sports payments — not for standalone items
        // like uniforms, transport, trips, or registration fees
        var termFee = await _db.TermFee.AsNoTracking()
            .FirstOrDefaultAsync(f => f.TermId == request.TermId && f.GradeId == gradeHistory.GradeId);

        var needsTermFee = request.SelectedItems?.Any(i =>
            i.ItemType == PaymentItemType.Tuition ||
            i.ItemType == PaymentItemType.SportsLevy) == true;

        if (needsTermFee && termFee is null)
            throw new BusinessRuleException("No fee is configured for this term and grade.");

        // ── ZiG conversion ────────────────────────────────────────────────────
        decimal amountUsd; decimal? zigRateUsed = null;
        if (request.Currency.ToUpperInvariant() == "ZIG")
        {
            zigRateUsed = await _zigRate.GetCurrentRateValueAsync();
            amountUsd = Math.Round(request.AmountPaid / zigRateUsed.Value, 2);
        }
        else amountUsd = request.AmountPaid;

        // Only fetch effective fee when tuition/sports items are selected
        var effectiveFee = needsTermFee
            ? await _feeRules.GetEffectiveFeeAsync(request.StudentId, request.TermId, request.AcademicYearId)
            : null;
        var selected = request.SelectedItems ?? [];
        var selectedTypes = selected.Select(s => s.ItemType).ToHashSet();
        // No fallback — if nothing is selected we allocate nothing (validation on client).

        // Only honour StartingTermMonthId when it falls within THIS term's months.
        // A student enrolled in Term 2 has a StartingTermMonthId from Term 2 — if we
        // pass it to the splitter for Term 3 it never matches, every month is skipped,
        // and no tuition breakdown is produced (receipt shows $0 tuition).
        var termMonthIdSet = term.TermMonths.Select(m => m.Id).ToHashSet();
        int? effectiveStartingMonthId = gradeHistory.StartingTermMonthId.HasValue
            && termMonthIdSet.Contains(gradeHistory.StartingTermMonthId.Value)
                ? gradeHistory.StartingTermMonthId
                : null;

        decimal remaining = amountUsd;
        var breakdowns = new List<PaymentBreakdown>();

        // ═══════════════════════════════════════════════════════════════════
        // AUTO GROUP — allocated first (compulsory items only flow here)
        // ═══════════════════════════════════════════════════════════════════

        // 1. Admission fee
        if (selectedTypes.Contains(PaymentItemType.AdmissionFee) && remaining > 0)
        {
            var s = await _db.AdmissionFeeSetting.AsNoTracking()
                .FirstOrDefaultAsync(a => a.AcademicYearId == request.AcademicYearId);
            if (s is not null)
            {
                decimal alloc = EffectiveCap(selected, PaymentItemType.AdmissionFee, s.Amount, remaining);
                remaining -= alloc;
                breakdowns.Add(Bd(PaymentItemType.AdmissionFee, "Admission Fee", s.Amount, alloc));
            }
        }

        // 2. Sports levy
        if (selectedTypes.Contains(PaymentItemType.SportsLevy) && remaining > 0 && effectiveFee is not null)
        {
            var firstMonth = term.TermMonths.MinBy(m => m.SortOrder);
            if (firstMonth is not null)
            {
                decimal alloc = EffectiveCap(selected, PaymentItemType.SportsLevy, effectiveFee.SportsLevyAmount, remaining);
                remaining -= alloc;
                breakdowns.Add(Bd(PaymentItemType.SportsLevy,
                    $"Sports Levy \u2014 {firstMonth.MonthName}",
                    effectiveFee.SportsLevyAmount, alloc, termMonthId: firstMonth.Id));
            }
        }

        // 3. Tuition — sequential allocation via PaymentSplitter.
        //    The user selects which months they intend to cover but tuition is
        //    ALWAYS cleared sequentially: the earliest unpaid month is settled
        //    first, regardless of which months were ticked.
        //    (If the student has April arrears and the user picks May, the money
        //    goes to April first, then May with whatever remains.)
        //    Transport has no such rule — it is explicit per-month.
        var selectedTuitionMonthIds = selected
            .Where(s => s.ItemType == PaymentItemType.Tuition && s.TermMonthId.HasValue)
            .Select(s => s.TermMonthId!.Value)
            .ToHashSet();

        if (selectedTuitionMonthIds.Count > 0 && remaining > 0)
        {
            // Load existing tuition payments for this student/term so the splitter
            // knows which months have already been (partially) settled.
            var existingRaw = await _db.PaymentBreakdown.AsNoTracking()
    .Include(pb => pb.Payment)
    .Where(pb => pb.Payment.StudentId == request.StudentId
              && pb.Payment.TermId == request.TermId
              && pb.Payment.AcademicYearId == request.AcademicYearId
              && pb.Payment.Status == PaymentStatus.Completed
              && pb.ItemType == PaymentItemType.Tuition
              && pb.TermMonthId != null)
    .Select(pb => new ExistingAllocation(pb.TermMonthId!.Value, pb.AmountPaid))
    .ToListAsync();

            // Aggregate by month to avoid duplicate keys
            var existing = existingRaw
                .GroupBy(e => e.TermMonthId)
                .Select(g => new ExistingAllocation(g.Key, g.Sum(e => e.AmountAlreadyPaid)))
                .ToList();

            // Determine how much to allocate: enough to cover the selected months
            // using the OVERRIDE-AWARE per-month dues from EffectiveFee, not a flat split.
            int monthCount = term.TermMonths.Count;

            // Build override-aware per-month due map from effectiveFee
            var monthDues = PaymentSplitter.BuildMonthDues(effectiveFee.Months);

            var orderedMonths = term.TermMonths.OrderBy(m => m.SortOrder).ToList();

            // Build a paid-map to calculate outstanding for selected months only
            var paidMap = existing.ToDictionary(e => e.TermMonthId, e => e.AmountAlreadyPaid);

            decimal selectedOutstanding = 0m;
            foreach (var m in orderedMonths)
            {
                if (!selectedTuitionMonthIds.Contains(m.Id)) continue;
                decimal due = monthDues.TryGetValue(m.Id, out var md) ? md
                    : Math.Round(effectiveFee.TuitionAmount / monthCount, 2);
                decimal alreadyPaid = paidMap.GetValueOrDefault(m.Id, 0m);

                // Surplus carry-forward: if a previously applied override reduced
                // this month's due BELOW what was already paid, the excess carries
                // into the next month automatically via the splitter.
                selectedOutstanding += Math.Max(0m, due - alreadyPaid);
            }

            // Build an accurate tuition budget cap that honours per-month partial payment amounts.
            //
            // For each selected month:
            //   • If the user supplied an OverrideAmount (partial pay), use that value.
            //   • Otherwise use the full outstanding for that month (monthDues minus already paid).
            //
            // This ensures that when the user pays June in full and July partially, the cap
            // reflects June_outstanding + July_partial — NOT just July_partial.
            decimal userTuitionCap = 0m;
            foreach (var m in orderedMonths)
            {
                if (!selectedTuitionMonthIds.Contains(m.Id)) continue;

                // Find the user-supplied item for this month
                var si = selected.FirstOrDefault(s => s.ItemType == PaymentItemType.Tuition
                                                   && s.TermMonthId == m.Id);

                if (si?.OverrideAmount is decimal partialAmt && partialAmt > 0)
                {
                    // User explicitly chose to pay a specific (possibly partial) amount
                    userTuitionCap += partialAmt;
                }
                else
                {
                    // No partial override — add the full outstanding for this month
                    decimal due = monthDues.TryGetValue(m.Id, out var md) ? md
                        : Math.Round(effectiveFee.TuitionAmount / monthCount, 2);
                    decimal alreadyPaid = paidMap.GetValueOrDefault(m.Id, 0m);
                    userTuitionCap += Math.Max(0m, due - alreadyPaid);
                }
            }

            // How much of 'remaining' do we use for tuition?
            // userTuitionCap is the sum of what the user intends to pay across selected months.
            // We cap at both the outstanding and the user's declared intent.
            decimal tuitionBudget = Math.Min(remaining, Math.Min(selectedOutstanding, userTuitionCap));

            if (tuitionBudget > 0)
            {
                var allocs = PaymentSplitter.Split(
                    term.TermMonths.OrderBy(m => m.SortOrder).ToList(),
                    effectiveFee.TuitionAmount,
                    tuitionBudget,
                    existing,
                    effectiveStartingMonthId,
                    monthDues);  // ← pass override-aware dues

                decimal tuitionAlloc = allocs.Sum(a => a.AmountPaid);
                remaining = Math.Max(0m, remaining - tuitionAlloc);
                breakdowns.AddRange(allocs
                    .Where(a => a.AmountPaid > 0 || a.AmountDue > 0)
                    .Select(a => new PaymentBreakdown
                    {
                        TermMonthId = a.TermMonthId,
                        ItemType = PaymentItemType.Tuition,
                        Label = $"Tuition — {a.MonthName}",
                        AmountDue = a.AmountDue,
                        AmountPaid = a.AmountPaid,
                        MonthStatus = a.Status
                    }));
            }
        }

        // 4. Report book (compulsory path — new student auto-allocated)
        if (selectedTypes.Contains(PaymentItemType.ReportBook) && remaining > 0)
        {
            var s = await _db.ReportBookSetting.AsNoTracking()
                .FirstOrDefaultAsync(r => r.AcademicYearId == request.AcademicYearId);
            if (s is not null)
            {
                decimal alloc = EffectiveCap(selected, PaymentItemType.ReportBook, s.Amount, remaining);
                remaining -= alloc;
                breakdowns.Add(Bd(PaymentItemType.ReportBook, "Report Book", s.Amount, alloc));
            }
        }

        // 5. Custom fees
        foreach (var ci in selected.Where(s => s.ItemType == PaymentItemType.CustomFee && s.ReferenceId.HasValue))
        {
            if (remaining <= 0) break;
            var cf = await _db.TermCustomFee.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == ci.ReferenceId!.Value && c.IsActive);
            if (cf is null) continue;
            decimal alloc = EffectiveCap(selected, PaymentItemType.CustomFee, cf.Amount, remaining, referenceId: ci.ReferenceId);
            remaining -= alloc;
            var bd = Bd(PaymentItemType.CustomFee, cf.Name, cf.Amount, alloc);
            bd.CustomFeeId = cf.Id;
            breakdowns.Add(bd);
        }

        // ═══════════════════════════════════════════════════════════════════
        // STANDALONE GROUP — manually checked, allocated after auto group
        // ═══════════════════════════════════════════════════════════════════

        // 6. Project fee
        if (selectedTypes.Contains(PaymentItemType.ProjectFee) && remaining > 0)
        {
            var s = await _db.ProjectFeeSetting.AsNoTracking()
                .FirstOrDefaultAsync(p => p.AcademicYearId == request.AcademicYearId);
            if (s is not null)
            {
                decimal alloc = EffectiveCap(selected, PaymentItemType.ProjectFee, s.Amount, remaining);
                remaining -= alloc;
                breakdowns.Add(Bd(PaymentItemType.ProjectFee, "Project Fee", s.Amount, alloc));
            }
        }

        // 7. Transport
        var transportSetting = selectedTypes.Contains(PaymentItemType.Transport)
            ? await _db.TransportFeeSetting.AsNoTracking()
                .FirstOrDefaultAsync(t => t.AcademicYearId == request.AcademicYearId)
            : null;
        foreach (var ti in selected.Where(s => s.ItemType == PaymentItemType.Transport && s.TermMonthId.HasValue))
        {
            if (remaining <= 0 || transportSetting is null) break;
            var month = term.TermMonths.FirstOrDefault(m => m.Id == ti.TermMonthId!.Value);
            if (month is null) continue;
            decimal alloc = EffectiveCap(selected, PaymentItemType.Transport, transportSetting.MonthlyAmount, remaining, termMonthId: ti.TermMonthId);
            remaining -= alloc;
            breakdowns.Add(Bd(PaymentItemType.Transport, $"Transport \u2014 {month.MonthName}",
                transportSetting.MonthlyAmount, alloc, termMonthId: month.Id));
        }

        // 8. Trips
        foreach (var ti in selected.Where(s => s.ItemType == PaymentItemType.Trip && s.ReferenceId.HasValue))
        {
            if (remaining <= 0) break;
            var trip = await _db.TripSetting.AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == ti.ReferenceId!.Value && t.IsActive);
            if (trip is null) continue;
            decimal alloc = EffectiveCap(selected, PaymentItemType.Trip, trip.Amount, remaining, referenceId: ti.ReferenceId);
            remaining -= alloc;
            breakdowns.Add(Bd(PaymentItemType.Trip, $"Trip \u2014 {trip.Name}",
                trip.Amount, alloc, referenceId: trip.Id));
        }

        // 9. Uniform
        decimal uniformTotal = 0m;
        var uniformLines = new List<(int itemId, string name, decimal price, int qty)>();
        if (selectedTypes.Contains(PaymentItemType.Uniform) && request.UniformSelections?.Any() == true)
        {
            foreach (var sel in request.UniformSelections.Where(s => s.Quantity > 0))
            {
                var ui = await _db.UniformItem.AsNoTracking().FirstOrDefaultAsync(u => u.Id == sel.UniformItemId && u.IsActive);
                if (ui is null) continue;
                decimal lineCost = ui.Price * sel.Quantity;
                uniformTotal += lineCost;
                uniformLines.Add((ui.Id, ui.Name, ui.Price, sel.Quantity));
            }
            if (uniformTotal > 0)
            {
                // Add one breakdown line per uniform item so receipt shows full detail
                foreach (var (itemId, name, price, qty) in uniformLines)
                {
                    if (remaining <= 0) break;
                    decimal lineCost = price * qty;
                    decimal alloc = Math.Min(remaining, lineCost);
                    remaining -= alloc;
                    breakdowns.Add(Bd(PaymentItemType.Uniform,
                        $"{name} \u00d7{qty}", lineCost, alloc));
                }
            }
        }

        // 10. Registration fee (last in standalone group)
        if (selectedTypes.Contains(PaymentItemType.RegistrationFee) && remaining > 0)
        {
            var s = await _db.RegistrationFeeSetting.AsNoTracking()
                .FirstOrDefaultAsync(r => r.AcademicYearId == request.AcademicYearId);
            if (s is not null)
            {
                decimal alloc = EffectiveCap(selected, PaymentItemType.RegistrationFee, s.Amount, remaining);
                remaining -= alloc;
                breakdowns.Add(Bd(PaymentItemType.RegistrationFee, "Registration Fee (Exam)", s.Amount, alloc));
            }
        }

        // 11. Extension month fees — per extension month, lookup configured amount for this grade
        foreach (var ei in selected.Where(s => s.ItemType == PaymentItemType.ExtensionFee && s.ReferenceId.HasValue))
        {
            if (remaining <= 0) break;
            var extMonth = await _db.TermExtensionMonth.AsNoTracking()
                .Include(em => em.ExtensionFees)
                .FirstOrDefaultAsync(em => em.Id == ei.ReferenceId!.Value && em.IsActive);
            if (extMonth is null) continue;

            var extFee = extMonth.ExtensionFees
                .FirstOrDefault(ef => ef.GradeId == gradeHistory.GradeId);
            if (extFee is null) continue;

            decimal alloc = EffectiveCap(selected, PaymentItemType.ExtensionFee, extFee.Amount, remaining, referenceId: ei.ReferenceId);
            remaining -= alloc;
            var bd = Bd(PaymentItemType.ExtensionFee, $"Extension \u2014 {extMonth.MonthName}", extFee.Amount, alloc, referenceId: extMonth.Id);
            // Store TermExtensionMonth.Id in CustomFeeId (same pattern as Trip/CustomFee)
            bd.CustomFeeId = extMonth.Id;
            breakdowns.Add(bd);
        }

        // ═══════════════════════════════════════════════════════════════════
        // SURPLUS HANDLING
        // ═══════════════════════════════════════════════════════════════════
        // Compute surplus: amount paid minus total actually allocated so far
        decimal totalAllocated = amountUsd - remaining;
        decimal surplus = remaining; // any unallocated USD is surplus

        // Apply user-directed surplus transfers (from request)
        var surplusTransferRecords = new List<(PaymentItemType target, int? refId, int? monthId, decimal amount, string? reason)>();
        if (surplus > 0 && request.SurplusTransfers?.Any() == true)
        {
            foreach (var st in request.SurplusTransfers)
            {
                if (surplus <= 0) break;
                decimal transferAmt = Math.Min(surplus, st.Amount);
                if (transferAmt <= 0) continue;
                surplus -= transferAmt;
                surplusTransferRecords.Add((st.TargetItemType, st.TargetReferenceId, st.TargetTermMonthId, transferAmt, st.Reason));
            }
        }

        // Any remaining surplus after user-directed transfers → next unpaid tuition month.
        // We only auto-credit tuition when tuition was part of the original selection.
        // Any remaining surplus → next unpaid tuition month (sequential, same splitter).
        if (surplus > 0 && selectedTuitionMonthIds.Count > 0 && effectiveFee is not null)
        {
            var surplusExisting = await _db.PaymentBreakdown.AsNoTracking()
                .Include(pb => pb.Payment)
                .Where(pb => pb.Payment.StudentId == request.StudentId
                          && pb.Payment.TermId == request.TermId
                          && pb.Payment.AcademicYearId == request.AcademicYearId
                          && pb.Payment.Status == PaymentStatus.Completed
                          && pb.ItemType == PaymentItemType.Tuition
                          && pb.TermMonthId != null)
                .Select(pb => new ExistingAllocation(pb.TermMonthId!.Value, pb.AmountPaid))
                .ToListAsync();

            // Merge with what was just allocated in this payment
            var thisPayTuition = breakdowns
                .Where(b => b.ItemType == PaymentItemType.Tuition && b.TermMonthId.HasValue)
                .Select(b => new ExistingAllocation(b.TermMonthId!.Value, b.AmountPaid));
            var merged = surplusExisting.Concat(thisPayTuition).ToList();

            var overflow = PaymentSplitter.Split(
                term.TermMonths.OrderBy(m => m.SortOrder).ToList(),
                effectiveFee.TuitionAmount,
                surplus, merged, effectiveStartingMonthId);

            foreach (var a in overflow.Where(a => a.AmountPaid > 0))
            {
                if (breakdowns.Any(b => b.TermMonthId == a.TermMonthId && b.ItemType == PaymentItemType.Tuition)) continue;
                breakdowns.Add(new PaymentBreakdown
                {
                    TermMonthId = a.TermMonthId,
                    ItemType = PaymentItemType.Tuition,
                    Label = $"Tuition — {a.MonthName}",
                    AmountDue = a.AmountDue,
                    AmountPaid = a.AmountPaid,
                    MonthStatus = a.Status
                });
                surplus = Math.Max(0m, surplus - a.AmountPaid);
            }
        }

        // ── Persist payment ───────────────────────────────────────────────────
        var payment = new Payment
        {
            StudentId = request.StudentId,
            TermId = request.TermId,
            AcademicYearId = request.AcademicYearId,
            PaymentMethodId = request.PaymentMethodId,
            AmountPaid = request.AmountPaid,
            AmountUsd = amountUsd,
            ZigRateUsed = zigRateUsed,
            Currency = request.Currency.ToUpperInvariant(),
            Reference = request.Reference,
            PrepaymentDescription = request.PrepaymentDescription,
            PaymentDate = DateTime.UtcNow,
            RecordedById = _currentUser.UserId,
            Notes = request.Notes,
            Status = PaymentStatus.Completed,
            Breakdowns = breakdowns
        };
        _db.Payment.Add(payment);
        await _db.SaveChangesAsync();

        // ── Persist surplus transfer records ──────────────────────────────────
        foreach (var (target, refId, monthId, amount, reason) in surplusTransferRecords)
        {
            _db.SurplusTransfer.Add(new SurplusTransfer
            {
                PaymentId = payment.Id,
                StudentId = payment.StudentId,
                TargetItemType = target,
                TargetReferenceId = refId,
                TargetTermMonthId = monthId,
                Amount = amount,
                Reason = reason,
                TransferredAt = DateTime.UtcNow,
                TransferredById = _currentUser.UserId,
            });

            // ── Also create the standalone fee record for the transfer target ──
            // surplusTransferRecords are logged in SurplusTransfer but were never
            // added to `breakdowns`, so PersistStandaloneRecordsAsync misses them.
            // We create the record here directly so trip/transport/project/etc.
            // payment tables stay in sync with the transfer log.
            switch (target)
            {
                case PaymentItemType.Trip:
                    if (refId.HasValue)
                    {
                        // The table has a unique index (StudentId, TripSettingId) so we
                        // upsert: accumulate amount on the existing row if it exists.
                        var existingTripRecordS = await _db.TripPaymentRecord.FirstOrDefaultAsync(
                            t => t.StudentId == payment.StudentId && t.TripSettingId == refId.Value);
                        if (existingTripRecordS != null)
                        {
                            existingTripRecordS.AmountPaid += amount;
                        }
                        else
                        {
                            _db.TripPaymentRecord.Add(new TripPaymentRecord
                            {
                                StudentId = payment.StudentId,
                                TripSettingId = refId.Value,
                                PaymentId = payment.Id,
                                AmountPaid = amount,
                                PaidAt = payment.PaymentDate,
                            });
                        }
                    }
                    break;

                case PaymentItemType.Transport:
                    if (monthId.HasValue)
                    {
                        var tSurplusSetting = await _db.TransportFeeSetting.AsNoTracking()
                            .FirstOrDefaultAsync(t => t.AcademicYearId == payment.AcademicYearId);

                        int? tDaysEntitled = null;
                        string? tSurplusNotes = null;
                        if (tSurplusSetting is not null && tSurplusSetting.MonthlyAmount > 0 && amount < tSurplusSetting.MonthlyAmount)
                        {
                            tDaysEntitled = (int)Math.Floor((double)(amount / tSurplusSetting.MonthlyAmount) * 20);
                            tSurplusNotes = $"Surplus transfer: {amount:F2}/{tSurplusSetting.MonthlyAmount:F2} — ~{tDaysEntitled} school days";
                        }

                        _db.TransportFeePayment.Add(new TransportFeePayment
                        {
                            StudentId    = payment.StudentId,
                            TermMonthId  = monthId.Value,
                            PaymentId    = payment.Id,
                            AmountPaid   = amount,
                            PaidAt       = payment.PaymentDate,
                            DaysEntitled = tDaysEntitled,
                            Notes        = tSurplusNotes
                        });
                    }
                    break;

                case PaymentItemType.ProjectFee:
    {
        _db.ProjectFeePayment.Add(new ProjectFeePayment
        {
            StudentId = payment.StudentId,
            AcademicYearId = payment.AcademicYearId,
            PaymentId = payment.Id,
            AmountPaid = amount,
            PaidAt = payment.PaymentDate,
        });
        break;
    }

                case PaymentItemType.RegistrationFee:
                    {
                        bool regAlreadyPaid = await _db.RegistrationFeePayment.AnyAsync(
                            r => r.StudentId == payment.StudentId && r.TermId == payment.TermId);
                        if (!regAlreadyPaid)
                            _db.RegistrationFeePayment.Add(new RegistrationFeePayment
                            {
                                StudentId = payment.StudentId,
                                AcademicYearId = payment.AcademicYearId,
                                TermId = payment.TermId,
                                PaymentId = payment.Id,
                                AmountPaid = amount,
                                PaidAt = payment.PaymentDate,
                            });
                        break;
                    }

                case PaymentItemType.ReportBook:
                    {
                        bool hasInitialBook = await _db.ReportBookPayment.AnyAsync(
                            r => r.StudentId == payment.StudentId && r.AcademicYearId == payment.AcademicYearId && !r.IsReplacement);
                        _db.ReportBookPayment.Add(new ReportBookPayment
                        {
                            StudentId = payment.StudentId,
                            AcademicYearId = payment.AcademicYearId,
                            PaymentId = payment.Id,
                            AmountPaid = amount,
                            IsReplacement = hasInitialBook,
                            PaidAt = payment.PaymentDate,
                        });
                        break;
                    }
                    // Tuition surplus is handled by the auto-credit block above (breakdowns).
                    // CustomFee has no standalone table — breakdown is sufficient.
            }
        }
        if (surplusTransferRecords.Any()) await _db.SaveChangesAsync();

        // ── Persist uniform purchase lines ────────────────────────────────────
        foreach (var (itemId, name, price, qty) in uniformLines)
        {
            _db.UniformPurchaseLine.Add(new UniformPurchaseLine
            {
                PaymentId = payment.Id,
                UniformItemId = itemId,
                Quantity = qty,
                UnitPrice = price,
                TotalPrice = price * qty
            });
        }
        if (uniformLines.Any()) await _db.SaveChangesAsync();

        // ── Persist standalone payment records ────────────────────────────────
        await PersistStandaloneRecordsAsync(payment, breakdowns, request);

        // ── Receipt ───────────────────────────────────────────────────────────
        // Use MAX(Id)+1 instead of COUNT+1 — COUNT drops when receipts are deleted,
        // causing duplicate sequence numbers on the next insert.
        var maxReceiptId  = await _db.Receipt.MaxAsync(r => (int?)r.Id) ?? 0;
        var receiptNumber = NumberGenerator.ReceiptNumber(DateTime.UtcNow.Year, maxReceiptId + 1);
        _db.Receipt.Add(new Receipt
        {
            PaymentId = payment.Id,
            ReceiptNumber = receiptNumber,
            IssuedAt = DateTime.UtcNow,
            IssuedById = _currentUser.UserId
        });
        await _db.SaveChangesAsync();

        await _audit.LogAsync("CREATE_PAYMENT", "Payment", payment.Id.ToString(), newValues: new
        {
            payment.StudentId,
            payment.AmountPaid,
            payment.Currency,
            method.Code,
            request.Reference,
            Items = selected.Select(s => s.ItemType.ToString()),
            SurplusTransfers = surplusTransferRecords.Count
        });

        return await _payments.GetByIdAsync(payment.Id);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Returns the effective cap for this item: if the user supplied an OverrideAmount
    /// on the SelectedFeeItem, that value is the ceiling. Otherwise the configured
    /// fee amount is the ceiling. Both are further capped by `remaining`.
    /// </summary>
    private static decimal EffectiveCap(
        IList<SelectedFeeItem> selected,
        PaymentItemType type,
        decimal configuredAmount,
        decimal remaining,
        int? referenceId = null,
        int? termMonthId = null)
    {
        var si = selected.FirstOrDefault(s =>
            s.ItemType == type
            && (referenceId == null || s.ReferenceId == referenceId)
            && (termMonthId == null || s.TermMonthId == termMonthId));

        decimal cap = (si?.OverrideAmount is decimal ov && ov > 0)
            ? Math.Min(ov, configuredAmount)
            : configuredAmount;

        return Math.Min(remaining, cap);
    }

    private static PaymentBreakdown Bd(
        PaymentItemType type, string label, decimal due, decimal paid,
        int? termMonthId = null, int? referenceId = null)
    {
        var bd = new PaymentBreakdown
        {
            ItemType = type,
            Label = label,
            AmountDue = due,
            AmountPaid = paid,
            MonthStatus = paid >= due ? MonthPaymentStatus.Paid
                        : paid > 0 ? MonthPaymentStatus.Partial
                                     : MonthPaymentStatus.Unpaid,
            TermMonthId = termMonthId
        };
        if (referenceId.HasValue && type == PaymentItemType.CustomFee)
            bd.CustomFeeId = referenceId;
        // Reuse CustomFeeId to carry TripSetting.Id for Trip breakdowns
        // (trips don't use CustomFeeId for anything else).
        if (referenceId.HasValue && type == PaymentItemType.Trip)
            bd.CustomFeeId = referenceId;
        // Reuse CustomFeeId to carry TermExtensionMonth.Id for ExtensionFee breakdowns.
        if (referenceId.HasValue && type == PaymentItemType.ExtensionFee)
            bd.CustomFeeId = referenceId;
        return bd;
    }

    private async Task PersistStandaloneRecordsAsync(
        Payment payment, List<PaymentBreakdown> breakdowns, CreatePaymentRequest request)
    {
        foreach (var bd in breakdowns)
        {
            switch (bd.ItemType)
            {
                case PaymentItemType.AdmissionFee:
                    _db.AdmissionFeePayment.Add(new AdmissionFeePayment
                    {
                        StudentId = payment.StudentId,
                        AcademicYearId = payment.AcademicYearId,
                        PaymentId = payment.Id,
                        AmountPaid = bd.AmountPaid,
                        PaidAt = payment.PaymentDate
                    });
                    // Clear the flag so the item no longer shows on future payments
                    var admStudent = await _db.Student.FindAsync(payment.StudentId);
                    if (admStudent is not null) admStudent.OwesAdmissionFee = false;
                    break;

                case PaymentItemType.RegistrationFee:
                    _db.RegistrationFeePayment.Add(new RegistrationFeePayment
                    {
                        StudentId = payment.StudentId,
                        AcademicYearId = payment.AcademicYearId,
                        TermId = payment.TermId,
                        PaymentId = payment.Id,
                        AmountPaid = bd.AmountPaid,
                        PaidAt = payment.PaymentDate
                    }); break;

                case PaymentItemType.ReportBook:
                    bool hasInitial = await _db.ReportBookPayment.AnyAsync(r =>
                        r.StudentId == payment.StudentId && r.AcademicYearId == payment.AcademicYearId && !r.IsReplacement);
                    _db.ReportBookPayment.Add(new ReportBookPayment
                    {
                        StudentId = payment.StudentId,
                        AcademicYearId = payment.AcademicYearId,
                        PaymentId = payment.Id,
                        AmountPaid = bd.AmountPaid,
                        IsReplacement = hasInitial,
                        PaidAt = payment.PaymentDate
                    }); break;

                case PaymentItemType.Transport:
                    if (bd.TermMonthId.HasValue)
                    {
                        // Get transport setting to calculate days entitled for partial payments
                        var tSetting = await _db.TransportFeeSetting.AsNoTracking()
                            .FirstOrDefaultAsync(t => t.AcademicYearId == payment.AcademicYearId);

                        // Find the SelectedFeeItem for this month to get optional metadata
                        var tItem = request.SelectedItems?.FirstOrDefault(s =>
                            s.ItemType == PaymentItemType.Transport &&
                            s.TermMonthId == bd.TermMonthId.Value);

                        int? totalDays = null;
                        int? daysEntitled = null;
                        DateTime? startDate = null;
                        string? tNotes = null;

                        if (tSetting is not null && tSetting.MonthlyAmount > 0 && bd.AmountPaid < tSetting.MonthlyAmount)
                        {
                            // Partial transport payment — calculate days entitled
                            // TotalSchoolDays can be supplied via OverrideAmount field repurposed,
                            // or we use a default (assume ~20 school days/month if not specified)
                            totalDays = tItem?.TotalSchoolDays ?? 20;
                            daysEntitled = (int)Math.Floor((double)(bd.AmountPaid / tSetting.MonthlyAmount) * totalDays.Value);
                            tNotes = $"Partial payment: {bd.AmountPaid:F2}/{tSetting.MonthlyAmount:F2} — {daysEntitled} of {totalDays} school days";
                        }

                        if (tItem?.TransportStartDate.HasValue == true)
                            startDate = tItem.TransportStartDate;

                        _db.TransportFeePayment.Add(new TransportFeePayment
                        {
                            StudentId         = payment.StudentId,
                            TermMonthId       = bd.TermMonthId.Value,
                            PaymentId         = payment.Id,
                            AmountPaid        = bd.AmountPaid,
                            PaidAt            = payment.PaymentDate,
                            TotalSchoolDays   = totalDays,
                            DaysEntitled      = daysEntitled,
                            TransportStartDate = startDate,
                            Notes             = tNotes
                        });
                    }
                    break;

                case PaymentItemType.Trip:
                    // TripSetting.Id was stored in bd.CustomFeeId by the Bd() helper.
                    // The table has a unique index (StudentId, TripSettingId) — upsert:
                    // accumulate on the existing row for top-up payments.
                    if (bd.CustomFeeId.HasValue)
                    {
                        var existingTripRecord = await _db.TripPaymentRecord.FirstOrDefaultAsync(
                            t => t.StudentId == payment.StudentId && t.TripSettingId == bd.CustomFeeId.Value);
                        if (existingTripRecord != null)
                        {
                            existingTripRecord.AmountPaid += bd.AmountPaid;
                        }
                        else
                        {
                            _db.TripPaymentRecord.Add(new TripPaymentRecord
                            {
                                StudentId = payment.StudentId,
                                TripSettingId = bd.CustomFeeId.Value,
                                PaymentId = payment.Id,
                                AmountPaid = bd.AmountPaid,
                                PaidAt = payment.PaymentDate
                            });
                        }
                    }
                    break;

                case PaymentItemType.ProjectFee:
                    _db.ProjectFeePayment.Add(new ProjectFeePayment
                    {
                        StudentId = payment.StudentId,
                        AcademicYearId = payment.AcademicYearId,
                        PaymentId = payment.Id,
                        AmountPaid = bd.AmountPaid,
                        PaidAt = payment.PaymentDate
                    }); break;
            }
        }
        await _db.SaveChangesAsync();
    }

    // ── Arrears payment ───────────────────────────────────────────────────────

    public async Task<PaymentDto> ProcessArrearsPaymentAsync(PayArrearsRequest request)
    {
        // Validate student exists
        var student = await _db.Student.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == request.StudentId)
            ?? throw new NotFoundException($"Student {request.StudentId} not found.");

        var method = await _db.PaymentMethod.AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == request.PaymentMethodId)
            ?? throw new BusinessRuleException("Payment method not found.");

        // Create the payment record under the current term
        var payment = new Payment
        {
            StudentId       = request.StudentId,
            TermId          = request.CurrentTermId,
            AcademicYearId  = request.AcademicYearId,
            PaymentMethodId = request.PaymentMethodId,
            AmountPaid      = request.AmountPaid,
            AmountUsd       = request.AmountPaid,
            Currency        = request.Currency ?? "USD",
            Reference       = request.Reference,
            Notes           = request.Notes,
            PaymentDate     = DateTime.Now,
            Status          = PaymentStatus.Completed,
            RecordedById    = _currentUser.UserId ?? string.Empty,
        };
        _db.Payment.Add(payment);
        await _db.SaveChangesAsync();

        // Add a single breakdown line with type = Arrears
        var breakdown = new PaymentBreakdown
        {
            PaymentId  = payment.Id,
            ItemType   = PaymentItemType.Arrears,
            AmountPaid = request.AmountPaid,
            AmountDue  = request.AmountPaid,
            Label      = $"Arrears — {request.Notes ?? "previous term balance"}",
        };
        _db.PaymentBreakdown.Add(breakdown);
        await _db.SaveChangesAsync();

        await _audit.LogAsync("ARREARS_PAYMENT", "Payment", payment.Id.ToString(),
            newValues: new { request.StudentId, request.AmountPaid, request.Notes });

        return await _payments.GetByIdAsync(payment.Id);
    }
}