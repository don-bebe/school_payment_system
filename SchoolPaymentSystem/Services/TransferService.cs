using Microsoft.EntityFrameworkCore;
using SchoolPaymentSystem.Data;
using SchoolPaymentSystem.DTO.Payment;
using SchoolPaymentSystem.Exceptions;
using SchoolPaymentSystem.Helpers;
using SchoolPaymentSystem.Models.fees;
using SchoolPaymentSystem.Models.payment;
using SchoolPaymentSystem.Services.Interfaces;

namespace SchoolPaymentSystem.Services;

/// <summary>
/// Handles standalone credit transfers: moving an existing paid amount
/// from one fee type to another (e.g. transport → tuition, trip → project fee).
///
/// Flow:
///  1. Locate the source PaymentBreakdown row that holds the credit.
///  2. Verify the credit is not already fully transferred away.
///  3. Reduce the source standalone fee record by the transfer amount.
///  4. Create the destination standalone fee record.
///  5. Add a PaymentBreakdown row on the original payment for the destination.
///  6. Log the transfer in SurplusTransfer (IsStandaloneTransfer = true).
/// </summary>
public class TransferService : ITransferService
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser         _currentUser;
    private readonly IAuditService        _audit;

    // Fee types that are sensible sources for credit transfers
    private static readonly HashSet<PaymentItemType> TransferableSources = new()
    {
        PaymentItemType.Transport,
        PaymentItemType.Trip,
        PaymentItemType.ProjectFee,
        PaymentItemType.RegistrationFee,
        PaymentItemType.ReportBook,
        PaymentItemType.SportsLevy,
        PaymentItemType.CustomFee,
        PaymentItemType.AdmissionFee,
        PaymentItemType.Tuition,
    };

    // Fee types that can receive transferred credit
    private static readonly HashSet<PaymentItemType> TransferableTargets = new()
    {
        PaymentItemType.Tuition,
        PaymentItemType.Transport,
        PaymentItemType.Trip,
        PaymentItemType.ProjectFee,
        PaymentItemType.RegistrationFee,
        PaymentItemType.ReportBook,
        PaymentItemType.SportsLevy,
        PaymentItemType.CustomFee,
        PaymentItemType.AdmissionFee,
    };

    public TransferService(
        ApplicationDbContext db,
        ICurrentUser currentUser,
        IAuditService audit)
    {
        _db          = db;
        _currentUser = currentUser;
        _audit       = audit;
    }

    // ── GetTransferableCreditsAsync ───────────────────────────────────────────

    public async Task<List<TransferableCredit>> GetTransferableCreditsAsync(
        int studentId, int academicYearId, int termId)
    {
        // Gather all completed breakdown lines for this student / term
        var breakdowns = await _db.PaymentBreakdown.AsNoTracking()
            .Include(b => b.Payment).ThenInclude(p => p.Receipt)
            .Where(b => b.Payment.StudentId     == studentId
                     && b.Payment.AcademicYearId == academicYearId
                     && b.Payment.TermId         == termId
                     && b.Payment.Status         == PaymentStatus.Completed
                     && b.AmountPaid             > 0
                     && TransferableSources.Contains(b.ItemType))
            .OrderByDescending(b => b.Payment.PaymentDate)
            .ToListAsync();

        // Calculate how much of each breakdown has already been transferred away
        // (to avoid double-counting credits that have been moved elsewhere)
        var alreadyTransferred = await _db.SurplusTransfer.AsNoTracking()
            .Where(s => s.StudentId          == studentId
                     && s.IsStandaloneTransfer
                     && s.SourceItemType     != null)
            .ToListAsync();

        var credits = new List<TransferableCredit>();

        foreach (var bd in breakdowns)
        {
            decimal transferred = alreadyTransferred
                .Where(t => t.SourceItemType     == bd.ItemType
                         && t.PaymentId          == bd.Payment.Id
                         && t.SourceReferenceId  == bd.ReferenceId()
                         && t.SourceTermMonthId  == bd.TermMonthId)
                .Sum(t => t.Amount);

            decimal available = bd.AmountPaid - transferred;
            if (available < 0.01m) continue;

            credits.Add(new TransferableCredit(
                PaymentId:        bd.Payment.Id,
                ReceiptNumber:    bd.Payment.Receipt?.ReceiptNumber ?? "—",
                ItemType:         bd.ItemType,
                Label:            bd.Label,
                AmountPaid:       bd.AmountPaid,
                AmountAvailable:  available,
                ReferenceId:      bd.ReferenceId(),
                TermMonthId:      bd.TermMonthId));
        }

        return credits;
    }

    // ── TransferCreditAsync ───────────────────────────────────────────────────

    public async Task<StandaloneTransferResult> TransferCreditAsync(StandaloneTransferRequest request)
    {
        if (request.Amount <= 0)
            throw new ValidationException("amount", "Transfer amount must be greater than zero.");

        if (!TransferableTargets.Contains(request.TargetItemType))
            throw new ValidationException("targetItemType", $"{request.TargetItemType} cannot receive transferred credit.");

        if (request.SourceItemType == request.TargetItemType
            && request.SourceReferenceId == request.TargetReferenceId
            && request.SourceTermMonthId == request.TargetTermMonthId)
            throw new ValidationException("target", "Source and destination cannot be the same fee type.");

        // ── Locate source breakdown ───────────────────────────────────────────
        var sourceBd = await _db.PaymentBreakdown
            .Include(b => b.Payment)
            .FirstOrDefaultAsync(b =>
                b.Payment.Id          == request.SourcePaymentId
             && b.Payment.StudentId   == request.StudentId
             && b.Payment.Status      == PaymentStatus.Completed
             && b.ItemType            == request.SourceItemType
             && b.TermMonthId         == request.SourceTermMonthId)
            ?? throw new NotFoundException("PaymentBreakdown",
                $"No completed {request.SourceItemType} breakdown on payment {request.SourcePaymentId}.");

        // ── Verify available credit ───────────────────────────────────────────
        decimal alreadyTransferred = await _db.SurplusTransfer
            .Where(s => s.StudentId         == request.StudentId
                     && s.IsStandaloneTransfer
                     && s.SourceItemType    == request.SourceItemType
                     && s.PaymentId         == request.SourcePaymentId
                     && s.SourceTermMonthId == request.SourceTermMonthId)
            .SumAsync(s => (decimal?)s.Amount) ?? 0m;

        decimal available = sourceBd.AmountPaid - alreadyTransferred;
        if (request.Amount > available + 0.001m)
            throw new BusinessRuleException(
                $"Only {available:F2} USD is available to transfer from this credit " +
                $"({sourceBd.AmountPaid:F2} paid, {alreadyTransferred:F2} already transferred).");

        // ── Build source and target labels ────────────────────────────────────
        string sourceLabel = sourceBd.Label;
        string targetLabel = await ResolveTargetLabelAsync(request);

        // ── Reduce source standalone record ───────────────────────────────────
        await ReduceSourceRecordAsync(request);

        // ── Create destination standalone record ──────────────────────────────
        var destPayment = sourceBd.Payment;  // attach the new record to the same payment
        await CreateDestinationRecordAsync(request, destPayment);

        // ── Add a breakdown line on the original payment for the destination ──
        // This makes the transfer visible on the original receipt as a note.
        _db.PaymentBreakdown.Add(new PaymentBreakdown
        {
            PaymentId   = request.SourcePaymentId,
            ItemType    = request.TargetItemType,
            Label       = $"[Transfer → {targetLabel}]",
            AmountDue   = request.Amount,
            AmountPaid  = request.Amount,
            MonthStatus = MonthPaymentStatus.Paid,
            TermMonthId = request.TargetTermMonthId,
            CustomFeeId = request.TargetItemType == PaymentItemType.CustomFee
                          ? request.TargetReferenceId : null,
        });

        // Also mark the source breakdown as reduced
        sourceBd.AmountPaid  = Math.Max(0, sourceBd.AmountPaid - request.Amount);
        sourceBd.MonthStatus = sourceBd.AmountPaid >= sourceBd.AmountDue ? MonthPaymentStatus.Paid
                             : sourceBd.AmountPaid > 0                   ? MonthPaymentStatus.Partial
                                                                         : MonthPaymentStatus.Unpaid;

        // ── Log the transfer ──────────────────────────────────────────────────
        var log = new SurplusTransfer
        {
            PaymentId           = request.SourcePaymentId,
            StudentId           = request.StudentId,
            SourceItemType      = request.SourceItemType,
            SourceReferenceId   = request.SourceReferenceId,
            SourceTermMonthId   = request.SourceTermMonthId,
            TargetItemType      = request.TargetItemType,
            TargetReferenceId   = request.TargetReferenceId,
            TargetTermMonthId   = request.TargetTermMonthId,
            Amount              = request.Amount,
            Reason              = request.Reason,
            IsStandaloneTransfer = true,
            TransferredAt       = DateTime.UtcNow,
            TransferredById     = _currentUser.UserId,
        };
        _db.SurplusTransfer.Add(log);

        await _db.SaveChangesAsync();

        var student = await _db.Student.FindAsync(request.StudentId);
        string studentName = student is not null
            ? $"{student.FirstName} {student.Surname}"
            : $"Student #{request.StudentId}";

        await _audit.LogAsync("TRANSFER_CREDIT", "SurplusTransfer", log.Id.ToString(),
            oldValues: null,
            newValues: new { request.SourceItemType, sourceLabel, request.TargetItemType,
                             targetLabel, request.Amount, request.Reason });

        return new StandaloneTransferResult(
            TransferId:    log.Id,
            SourceLabel:   sourceLabel,
            TargetLabel:   targetLabel,
            Amount:        request.Amount,
            StudentName:   studentName,
            TransferredAt: log.TransferredAt);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<string> ResolveTargetLabelAsync(StandaloneTransferRequest req)
    {
        return req.TargetItemType switch
        {
            PaymentItemType.Transport when req.TargetTermMonthId.HasValue =>
                $"Transport — {await MonthNameAsync(req.TargetTermMonthId.Value)}",
            PaymentItemType.Trip when req.TargetReferenceId.HasValue =>
                $"Trip — {await TripNameAsync(req.TargetReferenceId.Value)}",
            PaymentItemType.CustomFee when req.TargetReferenceId.HasValue =>
                await CustomFeeNameAsync(req.TargetReferenceId.Value),
            PaymentItemType.Tuition =>
                "Fees (Tuition)",
            _ => req.TargetItemType.ToString().Replace("Fee", " Fee").Trim()
        };
    }

    private async Task ReduceSourceRecordAsync(StandaloneTransferRequest req)
    {
        switch (req.SourceItemType)
        {
            case PaymentItemType.Transport when req.SourceTermMonthId.HasValue:
            {
                var rec = await _db.TransportFeePayment
                    .FirstOrDefaultAsync(r => r.StudentId  == req.StudentId
                                           && r.PaymentId  == req.SourcePaymentId
                                           && r.TermMonthId == req.SourceTermMonthId.Value);
                if (rec is not null)
                    rec.AmountPaid = Math.Max(0, rec.AmountPaid - req.Amount);
                break;
            }
            case PaymentItemType.Trip when req.SourceReferenceId.HasValue:
            {
                var rec = await _db.TripPaymentRecord
                    .FirstOrDefaultAsync(r => r.StudentId      == req.StudentId
                                           && r.PaymentId      == req.SourcePaymentId
                                           && r.TripSettingId  == req.SourceReferenceId.Value);
                if (rec is not null)
                    rec.AmountPaid = Math.Max(0, rec.AmountPaid - req.Amount);
                break;
            }
            case PaymentItemType.ProjectFee:
            {
                // Sum-based — find the matching ProjectFeePayment row for this payment
                var rec = await _db.ProjectFeePayment
                    .FirstOrDefaultAsync(r => r.StudentId == req.StudentId
                                           && r.PaymentId == req.SourcePaymentId);
                if (rec is not null)
                    rec.AmountPaid = Math.Max(0, rec.AmountPaid - req.Amount);
                break;
            }
            case PaymentItemType.RegistrationFee:
            {
                var rec = await _db.RegistrationFeePayment
                    .FirstOrDefaultAsync(r => r.StudentId == req.StudentId
                                           && r.PaymentId == req.SourcePaymentId);
                if (rec is not null)
                    rec.AmountPaid = Math.Max(0, rec.AmountPaid - req.Amount);
                break;
            }
            case PaymentItemType.ReportBook:
            {
                var rec = await _db.ReportBookPayment
                    .FirstOrDefaultAsync(r => r.StudentId == req.StudentId
                                           && r.PaymentId == req.SourcePaymentId);
                if (rec is not null)
                    rec.AmountPaid = Math.Max(0, rec.AmountPaid - req.Amount);
                break;
            }
            // Tuition, SportsLevy, CustomFee, AdmissionFee — no standalone table,
            // the breakdown reduction above is sufficient.
        }
    }

    private async Task CreateDestinationRecordAsync(StandaloneTransferRequest req, Payment payment)
    {
        switch (req.TargetItemType)
        {
            case PaymentItemType.Transport when req.TargetTermMonthId.HasValue:
                // Check if a record already exists for this month (add to it)
                var existingTransport = await _db.TransportFeePayment
                    .FirstOrDefaultAsync(r => r.StudentId  == req.StudentId
                                           && r.TermMonthId == req.TargetTermMonthId.Value);
                if (existingTransport is not null)
                    existingTransport.AmountPaid += req.Amount;
                else
                    _db.TransportFeePayment.Add(new TransportFeePayment
                    {
                        StudentId   = req.StudentId,
                        TermMonthId = req.TargetTermMonthId.Value,
                        PaymentId   = payment.Id,
                        AmountPaid  = req.Amount,
                        PaidAt      = DateTime.UtcNow,
                    });
                break;

            case PaymentItemType.Trip when req.TargetReferenceId.HasValue:
                var existingTrip = await _db.TripPaymentRecord
                    .FirstOrDefaultAsync(r => r.StudentId     == req.StudentId
                                           && r.TripSettingId == req.TargetReferenceId.Value);
                if (existingTrip is not null)
                    existingTrip.AmountPaid += req.Amount;
                else
                    _db.TripPaymentRecord.Add(new TripPaymentRecord
                    {
                        StudentId     = req.StudentId,
                        TripSettingId = req.TargetReferenceId.Value,
                        PaymentId     = payment.Id,
                        AmountPaid    = req.Amount,
                        PaidAt        = DateTime.UtcNow,
                    });
                break;

            case PaymentItemType.ProjectFee:
                _db.ProjectFeePayment.Add(new ProjectFeePayment
                {
                    StudentId      = req.StudentId,
                    AcademicYearId = req.AcademicYearId,
                    PaymentId      = payment.Id,
                    AmountPaid     = req.Amount,
                    PaidAt         = DateTime.UtcNow,
                });
                break;

            case PaymentItemType.RegistrationFee:
                _db.RegistrationFeePayment.Add(new RegistrationFeePayment
                {
                    StudentId      = req.StudentId,
                    AcademicYearId = req.AcademicYearId,
                    TermId         = req.TermId,
                    PaymentId      = payment.Id,
                    AmountPaid     = req.Amount,
                    PaidAt         = DateTime.UtcNow,
                });
                break;

            case PaymentItemType.ReportBook:
            {
                bool hasBook = await _db.ReportBookPayment.AnyAsync(
                    r => r.StudentId == req.StudentId && r.AcademicYearId == req.AcademicYearId && !r.IsReplacement);
                _db.ReportBookPayment.Add(new ReportBookPayment
                {
                    StudentId      = req.StudentId,
                    AcademicYearId = req.AcademicYearId,
                    PaymentId      = payment.Id,
                    AmountPaid     = req.Amount,
                    IsReplacement  = hasBook,
                    PaidAt         = DateTime.UtcNow,
                });
                break;
            }

            // Tuition, SportsLevy, AdmissionFee, CustomFee:
            // no dedicated standalone table — the PaymentBreakdown row added above
            // in the main method is the authoritative record for these types.
        }
    }

    private async Task<string> MonthNameAsync(int termMonthId) =>
        await _db.TermMonth.Where(m => m.Id == termMonthId).Select(m => m.MonthName).FirstOrDefaultAsync()
        ?? termMonthId.ToString();

    private async Task<string> TripNameAsync(int tripId) =>
        await _db.TripSetting.Where(t => t.Id == tripId).Select(t => t.Name).FirstOrDefaultAsync()
        ?? tripId.ToString();

    private async Task<string> CustomFeeNameAsync(int feeId) =>
        await _db.TermCustomFee.Where(f => f.Id == feeId).Select(f => f.Name).FirstOrDefaultAsync()
        ?? feeId.ToString();
}

// ── Extension helpers on PaymentBreakdown ────────────────────────────────────
internal static class PaymentBreakdownExtensions
{
    /// <summary>
    /// Returns the reference id for this breakdown row, if any.
    /// Only CustomFee has a stored reference id on the breakdown.
    /// Trip breakdowns are matched by ItemType + PaymentId in the caller.
    /// </summary>
    public static int? ReferenceId(this PaymentBreakdown bd) => bd.CustomFeeId;
}
