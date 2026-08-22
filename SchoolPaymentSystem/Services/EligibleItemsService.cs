using Microsoft.EntityFrameworkCore;
using SchoolPaymentSystem.Data;
using SchoolPaymentSystem.DTO.Payment;
using SchoolPaymentSystem.Exceptions;
using SchoolPaymentSystem.Models.fees;
using SchoolPaymentSystem.Models.payment;
using SchoolPaymentSystem.Services.Interfaces;

namespace SchoolPaymentSystem.Services;

public class EligibleItemsService : IEligibleItemsService
{
    private const int Grade6Level = 7;
    private const int Grade7Level = 8;

    private readonly ApplicationDbContext _db;
    private readonly IFeeRuleService _feeRules;

    public EligibleItemsService(ApplicationDbContext db, IFeeRuleService feeRules)
    {
        _db = db;
        _feeRules = feeRules;
    }

    public async Task<EligibleItemsResponse> GetEligibleItemsAsync(
        int studentId, int termId, int academicYearId)
    {
        var student = await _db.Student.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == studentId)
            ?? throw new NotFoundException("Student", studentId);

        if (!student.IsActive)
            throw new BusinessRuleException("Cannot process payment for a deactivated student.");

        var gradeHistory = await _db.StudentGradeHistory.AsNoTracking()
            .Include(h => h.Grade)
            .FirstOrDefaultAsync(h => h.StudentId == studentId
                                   && h.AcademicYearId == academicYearId)
            ?? throw new BusinessRuleException("Student has no grade assignment for this academic year.");

        var term = await _db.Term.AsNoTracking()
            .Include(t => t.TermMonths.OrderBy(m => m.SortOrder))
            .FirstOrDefaultAsync(t => t.Id == termId)
            ?? throw new NotFoundException("Term", termId);

        int gradeLevel = gradeHistory.Grade.Level;

        var items = new List<EligibleItemDto>();

        // 1. Admission fee — only shown when the student was flagged at enrolment
        //    as owing an admission fee (OwesAdmissionFee = true). Bulk-enrolled
        //    existing students are never flagged, so they never see this item.
        var admissionSetting = await _db.AdmissionFeeSetting.AsNoTracking()
            .FirstOrDefaultAsync(a => a.AcademicYearId == academicYearId);

        if (student.OwesAdmissionFee && admissionSetting is not null)
        {
            bool alreadyPaid = await _db.AdmissionFeePayment.AnyAsync(
                a => a.StudentId == studentId && a.AcademicYearId == academicYearId);
            if (!alreadyPaid)
                items.Add(new EligibleItemDto(PaymentItemType.AdmissionFee, "Admission Fee",
                    admissionSetting.Amount, null, null, IsCompulsory: true, AlreadyPaid: false));
        }

        // 2. Sports levy
        var termFee = await _db.TermFee.AsNoTracking()
            .FirstOrDefaultAsync(f => f.TermId == termId && f.GradeId == gradeHistory.GradeId);

        var firstMonth = term.TermMonths.FirstOrDefault();

        if (termFee is not null && termFee.SportsLevyAmount > 0)
        {
            bool isStaffChild = await _feeRules.IsEffectiveStaffChildAsync(studentId, academicYearId);
            decimal sportsAmount = isStaffChild && termFee.StaffChildSportsLevyAmount.HasValue
                ? termFee.StaffChildSportsLevyAmount.Value : termFee.SportsLevyAmount;

            bool sportsAlreadyPaid = firstMonth is not null && await _db.PaymentBreakdown.AnyAsync(pb =>
                pb.Payment.StudentId == studentId
                && pb.Payment.TermId == termId
                && pb.Payment.AcademicYearId == academicYearId
                && pb.Payment.Status == PaymentStatus.Completed
                && pb.ItemType == PaymentItemType.SportsLevy && pb.TermMonthId == firstMonth.Id);
            // Only show sports levy if it hasn't been paid yet for this term
            if (!sportsAlreadyPaid)
                items.Add(new EligibleItemDto(PaymentItemType.SportsLevy, "Sports Levy",
                    sportsAmount, null, firstMonth?.Id, IsCompulsory: true, AlreadyPaid: false));
        }

        // 3. Tuition — handled by fee rules service
        if (termFee is not null)
        {
            var effectiveFee = await _feeRules.GetEffectiveFeeAsync(studentId, termId, academicYearId);

            foreach (var month in effectiveFee.Months)
            {
                if (month.TuitionDue == 0) continue;

                bool tuitionPaid = month.TuitionDue > 0 && month.TuitionBalance == 0;
                // Skip months that are already fully settled — no point showing them
                if (tuitionPaid) continue;

                // Show the remaining balance for this month (not full fee if partially paid)
                decimal amountToShow = month.TuitionBalance > 0 ? month.TuitionBalance : month.TuitionDue;

                items.Add(new EligibleItemDto(
                    PaymentItemType.Tuition,
                    $"Tuition — {month.MonthName}",
                    amountToShow,
                    null,
                    month.TermMonthId,
                    IsCompulsory: true,
                    AlreadyPaid: false));
            }

            // 4. Report book
            var reportBookSetting = await _db.ReportBookSetting.AsNoTracking()
                .FirstOrDefaultAsync(r => r.AcademicYearId == academicYearId);

            if (reportBookSetting is not null)
            {
                bool alreadyPaid = await _db.ReportBookPayment.AnyAsync(
                    r => r.StudentId == studentId && r.AcademicYearId == academicYearId);
                if (!alreadyPaid)
                    items.Add(new EligibleItemDto(PaymentItemType.ReportBook, "Report Book",
                        reportBookSetting.Amount, null, null, IsCompulsory: false, AlreadyPaid: false));
            }

            // 5. Registration fee (Grade 6 & 7 only)
            var registrationSetting = await _db.RegistrationFeeSetting.AsNoTracking()
                .FirstOrDefaultAsync(r => r.AcademicYearId == academicYearId);

            if (registrationSetting is not null &&
                (gradeLevel == Grade6Level || gradeLevel == Grade7Level))
            {
                await AddRegistrationFeeItemAsync(items, studentId, gradeLevel,
                    academicYearId, termId, registrationSetting.Amount,
                    student.SkipsGrade6RegistrationArrear);
            }

            // 6. Transport — optional, one item per unpaid term month
            var transportSetting = await _db.TransportFeeSetting.AsNoTracking()
                .FirstOrDefaultAsync(t => t.AcademicYearId == academicYearId);

            if (transportSetting is not null)
            {

                foreach (var tMonth in term.TermMonths.OrderBy(m => m.SortOrder))
                {
                    // Sum all payments for this student for this month (multiple partial payments allowed)
                    decimal totalPaidForMonth = await _db.TransportFeePayment.AsNoTracking()
                        .Where(t => t.StudentId == studentId && t.TermMonthId == tMonth.Id)
                        .SumAsync(t => (decimal?)t.AmountPaid) ?? 0m;

                    decimal monthlyFee = transportSetting.MonthlyAmount;
                    decimal remainingForMonth = Math.Max(0m, monthlyFee - totalPaidForMonth);

                    if (remainingForMonth <= 0.001m) continue; // fully paid for this month

                    string label = totalPaidForMonth > 0
                        ? $"Transport — {tMonth.MonthName} (balance: {remainingForMonth:F2})"
                        : $"Transport — {tMonth.MonthName}";

                    items.Add(new EligibleItemDto(
                        PaymentItemType.Transport,
                        label,
                        remainingForMonth,   // show remaining balance, not full fee
                        null,
                        tMonth.Id,
                        IsCompulsory: false,
                        AlreadyPaid: false));
                }
            }

            // 7. Project fee — Grade 6 and Grade 7
            //    A student may start paying the project fee in Grade 6 and finish
            //    in Grade 7 (or pay it all at once in either year).
            //    We track the total paid across ALL academic years so a partial
            //    payment in Grade 6 reduces what is shown in Grade 7.
            var projectSetting = await _db.ProjectFeeSetting.AsNoTracking()
                .FirstOrDefaultAsync(p => p.AcademicYearId == academicYearId);

            if (projectSetting is not null &&
                (gradeLevel == Grade6Level || gradeLevel == Grade7Level))
            {
                // Sum all project fee payments this student has ever made across
                // any academic year — so a Grade 6 partial payment is respected in Grade 7.
                decimal totalProjectPaid = await _db.ProjectFeePayment
                    .Where(p => p.StudentId == studentId)
                    .SumAsync(p => (decimal?)p.AmountPaid) ?? 0m;

                decimal projectRemaining = projectSetting.Amount - totalProjectPaid;

                if (projectRemaining > 0.001m)
                {
                    string projectLabel = totalProjectPaid > 0
                        ? $"Project Fee (balance — ${projectRemaining:F2} remaining)"
                        : "Project Fee";

                    items.Add(new EligibleItemDto(PaymentItemType.ProjectFee,
                        projectLabel, projectRemaining, null, null,
                        IsCompulsory: false, AlreadyPaid: false));
                }
            }

            // 8. Custom fees — optional
            var customFees = await _db.TermCustomFee.AsNoTracking()
                .Include(c => c.TermFee)
                .Where(c => c.TermFee.TermId == termId && c.IsActive)
                .ToListAsync();

            foreach (var fee in customFees)
            {
                bool alreadyPaid = await _db.PaymentBreakdown.AnyAsync(pb =>
                    pb.Payment.StudentId == studentId
                    && pb.Payment.TermId == termId
                    && pb.Payment.Status == PaymentStatus.Completed
                    && pb.ItemType == PaymentItemType.CustomFee
                    && pb.CustomFeeId == fee.Id);
                if (!alreadyPaid)
                    items.Add(new EligibleItemDto(PaymentItemType.CustomFee, fee.Name,
                        fee.Amount, fee.Id, null, IsCompulsory: false, AlreadyPaid: false));
            }

            // 9. Trips — optional
            // Use balance tracking so partial trip payments are supported:
            // sum what has been paid and only show the remaining balance.
            var activeTrips = await _db.TripSetting.AsNoTracking()
                .Where(t => t.TermId == termId && t.IsActive).ToListAsync();
            foreach (var trip in activeTrips)
            {
                decimal totalTripPaid = await _db.TripPaymentRecord
                    .Where(t => t.StudentId == studentId && t.TripSettingId == trip.Id)
                    .SumAsync(t => (decimal?)t.AmountPaid) ?? 0m;

                decimal tripRemaining = trip.Amount - totalTripPaid;
                if (tripRemaining <= 0.001m) continue; // fully paid — skip

                string tripLabel = totalTripPaid > 0
                    ? $"Trip — {trip.Name} (balance: {tripRemaining:F2})"
                    : $"Trip — {trip.Name}";

                items.Add(new EligibleItemDto(PaymentItemType.Trip,
                    tripLabel, tripRemaining, trip.Id, null,
                    IsCompulsory: false, AlreadyPaid: false));
            }

            // 10. Extension month fees — shown only to grades that have a configured fee.
            //     For partial payments: if some amount has been paid but not the full fee,
            //     show the item with Amount = remaining balance so the student can top up.
            var extensionMonths = await _db.TermExtensionMonth.AsNoTracking()
                .Include(em => em.ExtensionFees)
                .Where(em => em.TermId == termId && em.IsActive)
                .OrderBy(em => em.MonthNumber)
                .ToListAsync();

            foreach (var extMonth in extensionMonths)
            {
                var extFee = extMonth.ExtensionFees
                    .FirstOrDefault(ef => ef.GradeId == gradeHistory.GradeId);
                if (extFee is null) continue;  // grade not configured — skip

                // Sum all completed payments for this extension month for this student
                decimal extPaid = await _db.PaymentBreakdown
                    .Where(pb =>
                        pb.Payment.StudentId   == studentId
                        && pb.Payment.TermId         == termId
                        && pb.Payment.AcademicYearId == academicYearId
                        && pb.Payment.Status         == PaymentStatus.Completed
                        && pb.ItemType               == PaymentItemType.ExtensionFee
                        && pb.CustomFeeId            == extMonth.Id)
                    .SumAsync(pb => pb.AmountPaid);

                decimal extRemaining = Math.Max(0m, extFee.Amount - extPaid);

                // Fully paid — don't show
                if (extRemaining <= 0.001m) continue;

                // Partially or unpaid — show with remaining balance as the Amount
                // so the payment card pre-fills the correct outstanding value
                items.Add(new EligibleItemDto(
                    PaymentItemType.ExtensionFee,
                    extPaid > 0
                        ? $"Extension — {extMonth.MonthName} (balance)"
                        : $"Extension — {extMonth.MonthName}",
                    extRemaining,
                    extMonth.Id,
                    null,
                    IsCompulsory: true,
                    AlreadyPaid:  false));
            }

            // 11. Uniform — optional
            items.Add(new EligibleItemDto(PaymentItemType.Uniform, "Uniform",
                0m, null, null, IsCompulsory: false, AlreadyPaid: false));

            decimal arrearsOwing = await ComputeTuitionArrearsAsync(studentId, academicYearId, termId);

            // FIX: resolve enum value before LINQ query — EF Core cannot translate
            // enum.ToString() to SQL. Compare enum values directly instead.
            var studentGenderEnum = student.Gender == "Male" ? UniformGender.Boys : UniformGender.Girls;

            var uniformItems = await _db.UniformItem.AsNoTracking()
                .Where(u => u.IsActive && (u.Gender == UniformGender.Both
                                        || u.Gender == studentGenderEnum))
                .OrderBy(u => u.Name)
                .Select(u => new UniformItemEligibleDto(u.Id, u.Name, u.Price))
                .ToListAsync();

            return new EligibleItemsResponse(studentId,
                $"{student.FirstName} {student.Surname}",
                gradeHistory.Grade.Name, items, arrearsOwing, uniformItems);
        }

        // No TermFee configured for this grade/term — return items collected so far
        return new EligibleItemsResponse(studentId,
            $"{student.FirstName} {student.Surname}",
            gradeHistory.Grade.Name, items, 0m, []);
    }

    // ── Registration fee arrear carry-forward logic ───────────────────────────
    private async Task AddRegistrationFeeItemAsync(
        List<EligibleItemDto> items, int studentId, int gradeLevel,
        int academicYearId, int termId, decimal amount, bool skipsGrade6Arrear)
    {
        if (gradeLevel == Grade6Level)
        {
            decimal totalPaidAmount = await _db.RegistrationFeePayment
                .Where(r => r.StudentId == studentId && r.AcademicYearId == academicYearId)
                .SumAsync(r => (decimal?)r.AmountPaid) ?? 0m;
            decimal remaining = amount - totalPaidAmount;
            if (remaining > 0.001m)
                items.Add(new EligibleItemDto(PaymentItemType.RegistrationFee,
                    "Registration Fee (Exam)", remaining, null, null, false, false));
        }
        else // Grade 7
        {
            // Calculate total already paid and determine the full amount owed.
            // A Grade 7 student owes: amount (Grade 7 fee) + optionally amount (Grade 6 arrear).
            // We use the sum-of-payments approach rather than record count so that
            // partial payments across multiple transactions are handled correctly.
            decimal totalPaidAmount = await _db.RegistrationFeePayment
                .Where(r => r.StudentId == studentId)
                .SumAsync(r => (decimal?)r.AmountPaid) ?? 0m;

            // Determine whether the Grade 6 arrear applies:
            // it applies only if nothing has been paid yet AND the student didn't skip Grade 6.
            bool hasGrade6Arrear = totalPaidAmount == 0 && !skipsGrade6Arrear;
            decimal fullAmount   = skipsGrade6Arrear ? amount : amount * 2;  // always 2x unless skipping
            decimal remaining    = fullAmount - totalPaidAmount;

            if (remaining > 0.001m)
            {
                string label = hasGrade6Arrear
                    ? "Registration Fee (Exam — includes Grade 6 arrear)"
                    : totalPaidAmount > 0
                        ? "Registration Fee (Exam — balance remaining)"
                        : "Registration Fee (Exam)";
                items.Add(new EligibleItemDto(PaymentItemType.RegistrationFee,
                    label, remaining, null, null, false, false));
            }
        }
    }

    // ── Tuition arrears computation ───────────────────────────────────────────
    // Mirrors GetGradeViewAsync's arrears logic exactly:
    // - Only includes terms with a LOWER TermNumber than the current term (prevents
    //   future-term balances bleeding back when a term is temporarily toggled active)
    // - Also checks all terms from prior academic years
    private async Task<decimal> ComputeTuitionArrearsAsync(
        int studentId, int academicYearId, int termId)
    {
        // Get current term's number and year so we can filter correctly
        var currentTerm = await _db.Term.AsNoTracking()
            .Where(t => t.Id == termId)
            .Select(t => new { t.Id, t.TermNumber, t.AcademicYearId })
            .FirstAsync();

        var currentYear = await _db.AcademicYear.AsNoTracking()
            .Where(y => y.Id == academicYearId)
            .Select(y => y.Year)
            .FirstAsync();

        // Prior terms: same year, lower term number
        var priorTermsThisYear = await _db.Term.AsNoTracking()
            .Where(t => t.AcademicYearId == academicYearId
                     && t.TermNumber < currentTerm.TermNumber)
            .Select(t => new { t.Id, t.Name, t.AcademicYearId, Label = t.Name })
            .ToListAsync();

        // Prior academic years: all terms
        var priorYearTerms = await _db.Term.AsNoTracking()
            .Include(t => t.AcademicYear)
            .Where(t => t.AcademicYear.Year < currentYear)
            .Select(t => new { t.Id, t.Name, t.AcademicYearId,
                               Label = t.AcademicYear.Name + " " + t.Name })
            .ToListAsync();

        var allPriorTerms = priorTermsThisYear
            .Concat(priorYearTerms)
            .ToList();

        if (allPriorTerms.Count == 0) return 0m;

        var gradeHistory = await _db.StudentGradeHistory.AsNoTracking()
            .FirstOrDefaultAsync(h => h.StudentId == studentId && h.AcademicYearId == academicYearId);

        if (gradeHistory is null) return 0m;

        var allPriorTermIds  = allPriorTerms.Select(t => t.Id).ToList();
        var allPriorYearIds  = allPriorTerms.Select(t => t.AcademicYearId).Distinct().ToList();

        var prevBreakdowns = await _db.PaymentBreakdown.AsNoTracking()
            .Include(pb => pb.Payment)
            .Where(pb => pb.Payment.StudentId == studentId
                      && allPriorTermIds.Contains(pb.Payment.TermId)
                      && allPriorYearIds.Contains(pb.Payment.AcademicYearId)
                      && pb.Payment.Status == PaymentStatus.Completed
                      && (pb.ItemType == PaymentItemType.Tuition
                       || pb.ItemType == PaymentItemType.Arrears))
            .ToListAsync();

        decimal totalArrears = 0m;

        foreach (var term in allPriorTerms)
        {
            var tMonths = await _db.TermMonth.AsNoTracking()
                .Where(m => m.TermId == term.Id)
                .OrderBy(m => m.SortOrder)
                .ToListAsync();

            if (!tMonths.Any()) continue;

            // Grade history for the term's academic year (may differ from current year)
            var gradeHistForTerm = await _db.StudentGradeHistory.AsNoTracking()
                .FirstOrDefaultAsync(h => h.StudentId == studentId
                                       && h.AcademicYearId == term.AcademicYearId);
            if (gradeHistForTerm is null) continue;

            var tFee = await _db.TermFee.AsNoTracking()
                .Include(tf => tf.MonthFees)
                .FirstOrDefaultAsync(f => f.TermId == term.Id && f.GradeId == gradeHistForTerm.GradeId);

            if (tFee is null) continue;

            bool isStaffChild = await _feeRules.IsEffectiveStaffChildAsync(studentId, term.AcademicYearId);

            var termMonthIdsForTerm = tMonths.Select(m => (int?)m.Id).ToList();
            var sOverrides = await _db.StudentFeeOverride.AsNoTracking()
                .Where(o => o.StudentId == studentId
                         && o.AcademicYearId == term.AcademicYearId
                         && o.IsActive
                         && (o.TermMonthId == null || termMonthIdsForTerm.Contains(o.TermMonthId)))
                .ToListAsync();

            var wholeOverride = sOverrides.FirstOrDefault(o => o.TermMonthId == null && o.OverrideTuitionAmount.HasValue);
            decimal baseTuit = wholeOverride?.OverrideTuitionAmount
                ?? (isStaffChild && tFee.StaffChildTuitionAmount.HasValue
                    ? tFee.StaffChildTuitionAmount!.Value
                    : tFee.TuitionAmount);

            decimal tMonthCount = tMonths.Count;
            var tOverrideMap    = tFee.MonthFees.ToDictionary(mf => mf.TermMonthId, mf => mf.OverrideAmount);

            var tMonthIds = tMonths.Select(m => m.Id).ToHashSet();
            var sgh = await _db.StudentGradeHistory.AsNoTracking()
                .Where(h => h.StudentId == studentId
                         && h.StartingTermMonthId != null
                         && tMonthIds.Contains(h.StartingTermMonthId.Value))
                .FirstOrDefaultAsync();

            bool reached = sgh == null || sgh.StartingTermMonthId == null;
            decimal termDue  = 0m;
            decimal termPaid = 0m;

            for (int i = 0; i < tMonths.Count; i++)
            {
                var tm = tMonths[i];
                if (!reached)
                {
                    if (tm.Id == sgh!.StartingTermMonthId) reached = true;
                    else continue;
                }

                var mOv = sOverrides.FirstOrDefault(o => o.TermMonthId == tm.Id);
                decimal due;
                if (mOv?.OverrideTuitionAmount.HasValue == true)
                    due = mOv.OverrideTuitionAmount!.Value;
                else if (tOverrideMap.TryGetValue(tm.Id, out var gMOv))
                    due = gMOv;
                else
                {
                    decimal m2 = Math.Round(baseTuit / tMonthCount, 2);
                    decimal l2 = baseTuit - m2 * (tMonthCount - 1);
                    due = (i == tMonths.Count - 1) ? l2 : m2;
                }

                decimal paid = prevBreakdowns
                    .Where(pb => pb.Payment.TermId == term.Id
                              && pb.TermMonthId == (int?)tm.Id)
                    .Sum(pb => pb.AmountPaid);

                termDue  += due;
                termPaid += paid;
            }

            decimal arrearCredit = prevBreakdowns
                .Where(pb => pb.Payment.TermId == term.Id
                          && pb.ItemType == PaymentItemType.Arrears)
                .Sum(pb => pb.AmountPaid);
            termPaid += arrearCredit;

            totalArrears += Math.Max(0m, termDue - termPaid);
        }

        return totalArrears;
    }
}