using SchoolPaymentSystem.Models.payment;

namespace SchoolPaymentSystem.DTO.Payment;

/// <summary>
/// Request to manually transfer an existing paid credit from one service to another.
/// Example: $10 of transport credit → tuition, or $25 trip credit → project fee.
///
/// The source fee payment record is reduced by Amount.
/// A new destination fee record is created for Amount.
/// A SurplusTransfer log entry records the full paper trail.
/// </summary>
public record StandaloneTransferRequest(
    int StudentId,
    int AcademicYearId,
    int TermId,

    // ── Source ────────────────────────────────────────────────────────────
    /// <summary>The fee type the credit is being moved FROM.</summary>
    PaymentItemType SourceItemType,

    /// <summary>For Trip / CustomFee sources: the relevant record Id.</summary>
    int? SourceReferenceId,

    /// <summary>For Transport sources: the TermMonth.Id that was paid.</summary>
    int? SourceTermMonthId,

    /// <summary>
    /// The payment Id whose breakdown/standalone record holds the credit.
    /// Used to locate the exact record to reduce.
    /// </summary>
    int SourcePaymentId,

    // ── Destination ───────────────────────────────────────────────────────
    PaymentItemType TargetItemType,

    int? TargetReferenceId,   // Trip / CustomFee / AdmissionFee
    int? TargetTermMonthId,   // Transport target month

    /// <summary>Amount in USD to transfer (must be ≤ paid credit on source).</summary>
    decimal Amount,

    string? Reason
);

/// <summary>Response returned after a successful standalone transfer.</summary>
public record StandaloneTransferResult(
    int     TransferId,
    string  SourceLabel,
    string  TargetLabel,
    decimal Amount,
    string  StudentName,
    DateTime TransferredAt
);
