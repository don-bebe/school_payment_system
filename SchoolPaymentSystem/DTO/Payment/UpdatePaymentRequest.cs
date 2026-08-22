namespace SchoolPaymentSystem.DTO.Payment;

/// <summary>
/// Request body for correcting the breakdown of an existing completed payment.
/// Used when a mistake was made — e.g. $15 recorded against the wrong fee type.
/// The total AmountPaid on the payment is NOT changed; only the allocation
/// across fee types is corrected.
/// </summary>
public record UpdatePaymentRequest(
    /// <summary>
    /// The corrected set of breakdown lines. Each line specifies the fee type,
    /// its label, how much was due, and how much should be recorded as paid.
    /// The sum of AmountPaid values must equal the original payment's AmountUsd.
    /// </summary>
    List<UpdatePaymentBreakdownLine> Breakdowns,

    /// <summary>Optional notes explaining why the correction was made.</summary>
    string? CorrectionNotes
);

public record UpdatePaymentBreakdownLine(
    int     BreakdownId,    // existing PaymentBreakdown.Id to update
    decimal AmountPaid      // corrected amount paid for this line
);
