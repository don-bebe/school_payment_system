using Microsoft.EntityFrameworkCore;
using SchoolPaymentSystem.Data;
using SchoolPaymentSystem.DTO.Payment;
using SchoolPaymentSystem.DTO.Splitter;
using SchoolPaymentSystem.Exceptions;
using SchoolPaymentSystem.Helpers;
using SchoolPaymentSystem.Models;
using SchoolPaymentSystem.Models.payment;
using SchoolPaymentSystem.Services.Interfaces;

namespace SchoolPaymentSystem.Services;

public class PaymentService : IPaymentService
{
    private readonly ApplicationDbContext _db;
    private readonly IAuditService _audit;
    private readonly ICurrentUser _currentUser;
    private readonly IZigRateService _zigRate;

    public PaymentService(ApplicationDbContext db, IAuditService audit, ICurrentUser currentUser, IZigRateService zigRate)
    {
        _db          = db;
        _audit       = audit;
        _currentUser = currentUser;
        _zigRate     = zigRate;
    }

    // ── Create Payment ────────────────────────────────────────────────────────

    public async Task<PaymentDto> CreatePaymentAsync(CreatePaymentRequest request)
    {
        // Validate student
        var student = await _db.Student.FindAsync(request.StudentId)
                      ?? throw new NotFoundException("Student", request.StudentId);
        if (!student.IsActive)
            throw new BusinessRuleException("Cannot record payment for a deactivated student.");

        // Validate term & months
        var term = await _db.Term
            .Include(t => t.TermMonths.OrderBy(m => m.SortOrder))
            .FirstOrDefaultAsync(t => t.Id == request.TermId)
            ?? throw new NotFoundException("Term", request.TermId);

        if (!term.TermMonths.Any())
            throw new BusinessRuleException("This term has no months configured.");

        // Validate payment method and reference requirement
        var method = await _db.PaymentMethod.FindAsync(request.PaymentMethodId)
                     ?? throw new NotFoundException("PaymentMethod", request.PaymentMethodId);

        if (method.RequiresReference && string.IsNullOrWhiteSpace(request.Reference))
            throw new ValidationException("reference",
                $"{method.Name} payments require a transaction reference number.");

        if (!CurrencyHelper.IsValid(request.Currency))
            throw new ValidationException("currency", "Currency must be 'USD' or 'ZIG'.");

        // For prepayments the amount is an estimate and may be 0
        if (method.Code != "PREPAYMENT" && request.AmountPaid <= 0)
            throw new ValidationException("amountPaid", "Amount paid must be greater than zero.");

        // Get the term fee for this student's grade
        var gradeHistory = await _db.StudentGradeHistory.AsNoTracking()
            .FirstOrDefaultAsync(h => h.StudentId == request.StudentId
                                   && h.AcademicYearId == request.AcademicYearId)
            ?? throw new BusinessRuleException("Student has no grade assignment for this academic year.");

        var termFee = await _db.TermFee.AsNoTracking()
            .FirstOrDefaultAsync(f => f.TermId == request.TermId && f.GradeId == gradeHistory.GradeId)
            ?? throw new BusinessRuleException("No fee is configured for this term and grade.");

        // Resolve effective tuition amount (staff child / sibling override)
        decimal effectiveTuition = student.IsStaffChild && termFee.StaffChildTuitionAmount.HasValue
            ? termFee.StaffChildTuitionAmount.Value
            : termFee.TuitionAmount;

        // Load existing tuition breakdowns so the splitter picks up from the right month
        var existingBreakdowns = await _db.PaymentBreakdown.AsNoTracking()
            .Include(pb => pb.Payment)
            .Where(pb => pb.Payment.StudentId     == request.StudentId
                      && pb.Payment.TermId         == request.TermId
                      && pb.Payment.AcademicYearId == request.AcademicYearId
                      && pb.Payment.Status         == PaymentStatus.Completed
                      && pb.ItemType               == PaymentItemType.Tuition
                      && pb.TermMonthId            != null)
            .Select(pb => new ExistingAllocation(pb.TermMonthId!.Value, pb.AmountPaid))
            .ToListAsync();

        // ── ZiG → USD conversion ──────────────────────────────────────────────
        decimal amountUsd;
        decimal? zigRateUsed = null;

        if (request.Currency.ToUpperInvariant() == "ZIG")
        {
            zigRateUsed = await _zigRate.GetCurrentRateValueAsync();
            amountUsd   = Math.Round(request.AmountPaid / zigRateUsed.Value, 2);
        }
        else
        {
            amountUsd = request.AmountPaid;
        }

        // Run the tuition splitting algorithm using USD-equivalent amount
        // Load per-month overrides so the splitter respects custom rates
        var prepayOverrides = await _db.StudentFeeOverride.AsNoTracking()
            .Where(o => o.StudentId == request.StudentId &&
                        o.AcademicYearId == request.AcademicYearId &&
                        o.IsActive)
            .ToListAsync();

        Dictionary<int, decimal>? prepayMonthDues = null;
        if (prepayOverrides.Count > 0)
        {
            var orderedMonths = term.TermMonths.OrderBy(m => m.SortOrder).ToList();
            prepayMonthDues = new Dictionary<int, decimal>();
            int mc = orderedMonths.Count;
            decimal flatM = mc > 0 ? Math.Round(effectiveTuition / mc, 2) : 0m;
            decimal flatL = effectiveTuition - flatM * (mc - 1);
            for (int i = 0; i < orderedMonths.Count; i++)
            {
                var m  = orderedMonths[i];
                var ov = prepayOverrides.FirstOrDefault(o => o.TermMonthId == m.Id);
                prepayMonthDues[m.Id] = ov?.OverrideTuitionAmount.HasValue == true
                    ? ov.OverrideTuitionAmount!.Value
                    : i == mc - 1 ? flatL : flatM;
            }
        }

        var allocations = PaymentSplitter.Split(
            term.TermMonths.ToList(), effectiveTuition, amountUsd, existingBreakdowns,
            startingTermMonthId: gradeHistory.StartingTermMonthId,
            monthDues: prepayMonthDues);

        // Build tuition breakdown lines with ItemType and Label
        var breakdowns = allocations.Select(a => new PaymentBreakdown
        {
            TermMonthId = a.TermMonthId,
            ItemType    = PaymentItemType.Tuition,
            Label       = a.MonthName,
            AmountDue   = a.AmountDue,
            AmountPaid  = a.AmountPaid,
            MonthStatus = a.Status
        }).ToList();

        // Persist payment
        var payment = new Payment
        {
            StudentId             = request.StudentId,
            TermId                = request.TermId,
            AcademicYearId        = request.AcademicYearId,
            PaymentMethodId       = request.PaymentMethodId,
            AmountPaid            = request.AmountPaid,
            AmountUsd             = amountUsd,
            ZigRateUsed           = zigRateUsed,
            Currency              = request.Currency.ToUpperInvariant(),
            Reference             = request.Reference,
            PrepaymentDescription = request.PrepaymentDescription,
            PaymentDate           = DateTime.UtcNow,
            RecordedById          = _currentUser.UserId,
            Notes                 = request.Notes,
            Status                = PaymentStatus.Completed,
            Breakdowns            = breakdowns
        };

        _db.Payment.Add(payment);
        await _db.SaveChangesAsync();

        // Generate receipt
        // Use MAX(Id)+1 instead of COUNT+1 — COUNT drops when receipts are deleted,
        // causing duplicate sequence numbers on the next insert.
        var maxReceiptId  = await _db.Receipt.MaxAsync(r => (int?)r.Id) ?? 0;
        var receiptNumber = NumberGenerator.ReceiptNumber(DateTime.UtcNow.Year, maxReceiptId + 1);

        var receipt = new Receipt
        {
            PaymentId     = payment.Id,
            ReceiptNumber = receiptNumber,
            IssuedAt      = DateTime.UtcNow,
            IssuedById    = _currentUser.UserId
        };

        _db.Receipt.Add(receipt);
        await _db.SaveChangesAsync();

        await _audit.LogAsync("CREATE_PAYMENT", "Payment", payment.Id.ToString(),
            newValues: new { payment.StudentId, payment.AmountPaid, payment.Currency, method.Code, request.Reference });

        return await GetByIdAsync(payment.Id);
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    public async Task<PaymentDto> GetByIdAsync(int id)
    {
        var payment = await LoadPaymentAsync(id);
        return MapDto(payment);
    }

    public async Task<List<PaymentDto>> GetByStudentAsync(int studentId, int? termId, int? academicYearId)
    {
        var query = _db.Payment.AsNoTracking()
            .AsSplitQuery()
            .Include(p => p.Student)
            .Include(p => p.Term)
            .Include(p => p.AcademicYear)
            .Include(p => p.PaymentMethod)
            .Include(p => p.RecordedBy)
            .Include(p => p.Breakdowns).ThenInclude(b => b.TermMonth)
            .Where(p => p.StudentId == studentId);

        if (termId.HasValue)         query = query.Where(p => p.TermId         == termId.Value);
        if (academicYearId.HasValue) query = query.Where(p => p.AcademicYearId == academicYearId.Value);

        var list = await query.OrderByDescending(p => p.PaymentDate).ToListAsync();
        return list.Select(MapDto).ToList();
    }

    // ── Receipts ──────────────────────────────────────────────────────────────

    public async Task<ReceiptDto> GetReceiptAsync(int paymentId)
    {
        var payment = await LoadPaymentAsync(paymentId);
        return MapReceiptDto(payment);
    }

    public async Task<ReceiptDto> GetReceiptByNumberAsync(string receiptNumber)
    {
        var receipt = await _db.Receipt.AsNoTracking()
            .FirstOrDefaultAsync(r => r.ReceiptNumber == receiptNumber)
            ?? throw new NotFoundException($"Receipt '{receiptNumber}' not found.");
        var payment = await LoadPaymentAsync(receipt.PaymentId);
        return MapReceiptDto(payment);
    }

    public async Task MarkReceiptPrintedAsync(int paymentId)
    {
        var receipt = await _db.Receipt.FirstOrDefaultAsync(r => r.PaymentId == paymentId)
                      ?? throw new NotFoundException("Receipt for payment", paymentId);
        receipt.IsPrinted = true;
        receipt.PrintedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    // ── Reversal ──────────────────────────────────────────────────────────────

    public async Task ReversePaymentAsync(ReversePaymentRequest request)
    {
        var payment = await _db.Payment.FindAsync(request.PaymentId)
                      ?? throw new NotFoundException("Payment", request.PaymentId);

        if (payment.Status == PaymentStatus.Reversed)
            throw new BusinessRuleException("This payment has already been reversed.");

        var old = payment.Status;
        payment.Status = PaymentStatus.Reversed;
        await _db.SaveChangesAsync();

        await _audit.LogAsync("REVERSE_PAYMENT", "Payment", request.PaymentId.ToString(),
            oldValues: new { Status = old.ToString() },
            newValues: new { Status = "Reversed", Reason = request.Reason });
    }

    // ── Delete Payment ────────────────────────────────────────────────────────

    /// <summary>
    /// Permanently removes a payment and all its associated records.
    /// This restores any fee balances the payment had covered, allowing the student
    /// to be billed again. All standalone fee records (transport, project, registration,
    /// trip, report book, admission, uniform lines) are deleted via EF cascade.
    /// </summary>
    public async Task DeletePaymentAsync(int paymentId, string? reason)
    {
        var payment = await _db.Payment
            .AsSplitQuery()
            .Include(p => p.Breakdowns)
            .Include(p => p.RegistrationFeePayments)
            .Include(p => p.AdmissionFeePayments)
            .Include(p => p.TransportFeePayments)
            .Include(p => p.TripPaymentRecords)
            .Include(p => p.ProjectFeePayments)
            .Include(p => p.ReportBookPayments)
            .Include(p => p.UniformPurchaseLines)
            .Include(p => p.Receipt)
            .Include(p => p.Student)
            .FirstOrDefaultAsync(p => p.Id == paymentId)
            ?? throw new NotFoundException("Payment", paymentId);

        // Snapshot for audit
        var snapshot = new
        {
            payment.StudentId,
            StudentNumber = payment.Student.StudentNumber,
            payment.AmountPaid,
            payment.Currency,
            payment.PaymentDate,
            BreakdownCount = payment.Breakdowns.Count,
            Reason = reason
        };

        // Restore OwesAdmissionFee if this payment covered an admission fee
        if (payment.AdmissionFeePayments.Any())
        {
            var student = await _db.Student.FindAsync(payment.StudentId);
            if (student is not null) student.OwesAdmissionFee = true;
        }

        // EF cascade rules handle deletion of Breakdowns, standalone records,
        // Receipt (PaymentId FK has OnDelete Cascade), UniformPurchaseLines.
        // SurplusTransfer also cascades from PaymentId.
        _db.Payment.Remove(payment);
        await _db.SaveChangesAsync();

        await _audit.LogAsync("DELETE_PAYMENT", "Payment", paymentId.ToString(),
            oldValues: snapshot,
            newValues: new { Deleted = true, Reason = reason });
    }

    // ── Edit / Correct Payment ────────────────────────────────────────────────

    /// <summary>
    /// Corrects the allocation of an existing completed payment. Only the
    /// AmountPaid values on the breakdown lines can be changed. The total
    /// AmountPaid on the payment is NOT modified. All downstream standalone
    /// fee tables are also refreshed to stay in sync.
    /// </summary>
    public async Task<PaymentDto> EditPaymentAsync(int paymentId, UpdatePaymentRequest request)
    {
        var payment = await _db.Payment
            .AsSplitQuery()
            .Include(p => p.Breakdowns)
            .Include(p => p.ProjectFeePayments)
            .Include(p => p.RegistrationFeePayments)
            .Include(p => p.ReportBookPayments)
            .Include(p => p.TransportFeePayments)
            .Include(p => p.TripPaymentRecords)
            .FirstOrDefaultAsync(p => p.Id == paymentId)
            ?? throw new NotFoundException("Payment", paymentId);

        if (payment.Status == PaymentStatus.Reversed)
            throw new BusinessRuleException("Cannot edit a reversed payment.");

        // Validate: total corrected must equal original USD amount
        decimal correctedTotal = request.Breakdowns.Sum(b => b.AmountPaid);
        if (Math.Abs(correctedTotal - payment.AmountUsd) > 0.01m)
            throw new ValidationException("breakdowns",
                $"The sum of corrected amounts ({correctedTotal:F2}) must equal the original payment amount ({payment.AmountUsd:F2} USD).");

        // Build old-values snapshot for audit
        var oldBreakdowns = payment.Breakdowns
            .Select(b => new { b.Id, b.Label, b.AmountPaid })
            .ToList();

        // Apply corrections to each breakdown line
        foreach (var correction in request.Breakdowns)
        {
            var bd = payment.Breakdowns.FirstOrDefault(b => b.Id == correction.BreakdownId)
                     ?? throw new NotFoundException("PaymentBreakdown", correction.BreakdownId);

            if (correction.AmountPaid < 0)
                throw new ValidationException("amountPaid", "Corrected amount cannot be negative.");

            bd.AmountPaid  = correction.AmountPaid;
            bd.MonthStatus = correction.AmountPaid >= bd.AmountDue ? MonthPaymentStatus.Paid
                           : correction.AmountPaid > 0             ? MonthPaymentStatus.Partial
                                                                    : MonthPaymentStatus.Unpaid;
        }

        // Refresh the standalone fee tables to match the corrected breakdowns
        // ── Project Fee ───────────────────────────────────────────────────────
        // A single payment may have generated one ProjectFeePayment row. Update
        // that row to match the corrected breakdown amount.
        var projBd = payment.Breakdowns.FirstOrDefault(b => b.ItemType == PaymentItemType.ProjectFee);
        var projRec = payment.ProjectFeePayments.FirstOrDefault(p => p.PaymentId == payment.Id);
        if (projBd is not null && projRec is not null)
            projRec.AmountPaid = projBd.AmountPaid;

        // ── Registration Fee ──────────────────────────────────────────────────
        var regBd = payment.Breakdowns.FirstOrDefault(b => b.ItemType == PaymentItemType.RegistrationFee);
        var regRec = payment.RegistrationFeePayments.FirstOrDefault();
        if (regBd is not null && regRec is not null)
            regRec.AmountPaid = regBd.AmountPaid;

        // ── Report Book ───────────────────────────────────────────────────────
        var rbBd = payment.Breakdowns.FirstOrDefault(b => b.ItemType == PaymentItemType.ReportBook);
        var rbRec = payment.ReportBookPayments.FirstOrDefault();
        if (rbBd is not null && rbRec is not null)
            rbRec.AmountPaid = rbBd.AmountPaid;

        // ── Transport ─────────────────────────────────────────────────────────
        foreach (var tBd in payment.Breakdowns.Where(b => b.ItemType == PaymentItemType.Transport && b.TermMonthId.HasValue))
        {
            var tRec = payment.TransportFeePayments.FirstOrDefault(r => r.TermMonthId == tBd.TermMonthId);
            if (tRec is not null) tRec.AmountPaid = tBd.AmountPaid;
        }

        // ── Trips ─────────────────────────────────────────────────────────────
        var tripBd = payment.Breakdowns.FirstOrDefault(b => b.ItemType == PaymentItemType.Trip);
        var tripRec = payment.TripPaymentRecords.FirstOrDefault();
        if (tripBd is not null && tripRec is not null)
            tripRec.AmountPaid = tripBd.AmountPaid;

        // Append correction note
        if (!string.IsNullOrWhiteSpace(request.CorrectionNotes))
            payment.Notes = string.IsNullOrWhiteSpace(payment.Notes)
                ? $"[CORRECTION] {request.CorrectionNotes}"
                : $"{payment.Notes}\n[CORRECTION] {request.CorrectionNotes}";

        await _db.SaveChangesAsync();

        await _audit.LogAsync("EDIT_PAYMENT", "Payment", paymentId.ToString(),
            oldValues: new { Breakdowns = oldBreakdowns },
            newValues: new { Breakdowns = request.Breakdowns, request.CorrectionNotes });

        return await GetByIdAsync(paymentId);
    }

    // ── Payment Methods ───────────────────────────────────────────────────────

    public async Task<List<PaymentMethodDto>> GetPaymentMethodsAsync() =>
        await _db.PaymentMethod.AsNoTracking()
            .Where(m => m.IsActive)
            .OrderBy(m => m.Name)
            .Select(m => new PaymentMethodDto(m.Id, m.Name, m.Code, m.RequiresReference, m.IsActive))
            .ToListAsync();

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<Payment> LoadPaymentAsync(int id) =>
        await _db.Payment.AsNoTracking()
            .AsSplitQuery()
            .Include(p => p.Student)
                .ThenInclude(s => s.GradeHistories)
                    .ThenInclude(h => h.Grade)
            .Include(p => p.Term).ThenInclude(t => t.AcademicYear)
            .Include(p => p.AcademicYear)
            .Include(p => p.PaymentMethod)
            .Include(p => p.RecordedBy)
            .Include(p => p.Receipt)
            .Include(p => p.Breakdowns).ThenInclude(b => b.TermMonth)
            .Include(p => p.UniformPurchaseLines).ThenInclude(u => u.UniformItem)
            .FirstOrDefaultAsync(p => p.Id == id)
        ?? throw new NotFoundException("Payment", id);

    private static PaymentDto MapDto(Payment p) => new(
        p.Id,
        p.StudentId,
        $"{p.Student.FirstName} {p.Student.Surname}",
        p.Student.StudentNumber,
        p.TermId,
        p.Term.Name,
        p.Term.AcademicYear?.Name ?? p.AcademicYear.Name,
        p.PaymentMethod.Name,
        p.PaymentMethod.Code,
        p.Reference,
        p.AmountPaid,
        p.AmountUsd,
        p.ZigRateUsed,
        p.Currency,
        p.PrepaymentDescription,
        p.PaymentDate,
        $"{p.RecordedBy?.FirstName} {p.RecordedBy?.LastName}",
        p.Status.ToString(),
        p.Breakdowns
            .OrderBy(b => b.TermMonth?.SortOrder ?? 0)
            .Select(b => new PaymentBreakdownDto(
                b.Id,
                b.Label,
                b.AmountDue,
                b.AmountPaid,
                Math.Max(0m, b.AmountDue - b.AmountPaid),
                b.MonthStatus.ToString()))
            .ToList());

    private static ReceiptDto MapReceiptDto(Payment p)
    {
        if (p.Receipt is null)
            throw new InvalidOperationException(
                $"Payment {p.Id} has no receipt record. It may have been deleted or not yet issued.");
        return new(
        p.Receipt.Id,
        p.Receipt.ReceiptNumber,
        $"{p.Student.FirstName} {p.Student.Surname}",
        p.Student.StudentNumber,
        p.Student.GradeHistories
            .Where(h => h.AcademicYearId == p.AcademicYearId)
            .Select(h => h.Grade.Name)
            .FirstOrDefault() ?? string.Empty,
        p.Term.Name,
        p.Term.AcademicYear?.Name ?? p.AcademicYear.Name,
        p.AmountPaid,
        p.AmountUsd,
        p.ZigRateUsed,
        p.Currency,
        p.PaymentMethod.Name,
        p.PaymentMethod.Code,
        p.Reference,
        p.PrepaymentDescription,
        p.PaymentMethod.Code == "PREPAYMENT",
        p.PaymentDate,
        p.Receipt.IssuedAt,
        $"{p.RecordedBy?.FirstName} {p.RecordedBy?.LastName}",
        p.RecordedBy?.SignatureImageBase64,
        p.Receipt.IsPrinted,
        p.Breakdowns
            .OrderBy(b => b.TermMonth?.SortOrder ?? 0)
            .Select(b => new PaymentBreakdownDto(
                b.Id,
                b.Label,
                b.AmountDue,
                b.AmountPaid,
                Math.Max(0m, b.AmountDue - b.AmountPaid),
                b.MonthStatus.ToString()))
            .ToList(),
        p.UniformPurchaseLines
            .Select(u => new UniformReceiptLine(
                u.UniformItem.Name,
                u.Quantity,
                u.UnitPrice,
                u.TotalPrice))
            .ToList());
    }
}