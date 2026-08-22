using SchoolPaymentSystem.Models.term;

namespace SchoolPaymentSystem.Models.payment;

public class PaymentBreakdown
{
    public int     Id          { get; set; }
    public int     PaymentId   { get; set; }

    /// <summary>
    /// FK → TermMonth. Required for Tuition and SportsLevy lines (anchors the
    /// month being paid). Nullable for standalone fee lines (RegistrationFee,
    /// ReportBook, Uniform, etc.) which are not month-specific.
    /// </summary>
    public int?    TermMonthId { get; set; }

    /// <summary>What this breakdown line was paying for.</summary>
    public PaymentItemType ItemType { get; set; } = PaymentItemType.Tuition;

    /// <summary>
    /// For CustomFee lines: the TermCustomFee.Id being paid.
    /// For Uniform lines: not used (see UniformPurchaseLine).
    /// Null for all other item types.
    /// </summary>
    public int?    CustomFeeId { get; set; }

    /// <summary>
    /// Human-readable label for this line on the receipt.
    /// For Tuition/SportsLevy: populated from TermMonth.MonthName.
    /// For standalone fees: the fee name (e.g. "Registration Fee", "Report Book").
    /// For CustomFee: the TermCustomFee.Name.
    /// For Trip: the TripSetting.Name.
    /// </summary>
    public string  Label       { get; set; } = string.Empty;

    public decimal AmountDue   { get; set; }   // expected charge for this line
    public decimal AmountPaid  { get; set; }   // portion of the payment assigned here
    public decimal Balance     => AmountDue - AmountPaid;   // computed — ignored by EF

    public MonthPaymentStatus MonthStatus { get; set; } = MonthPaymentStatus.Unpaid;

    // ── Navigation ──────────────────────────────────────────────────────────
    public Payment   Payment   { get; set; } = null!;
    public TermMonth? TermMonth { get; set; }
}