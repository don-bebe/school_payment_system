using SchoolPaymentSystem.Models.payment;
using SchoolPaymentSystem.Models.user;

namespace SchoolPaymentSystem.Models.fees;

/// <summary>
/// Records a credit transfer — either a surplus transfer (when a payment
/// produces more than needed and the excess is directed elsewhere) or a
/// standalone transfer (when an admin manually moves credit from one service
/// to another, e.g. transport credit → tuition).
///
/// SourceItemType is null for surplus transfers (the source is the payment itself).
/// SourceItemType is set for standalone transfers so the log shows what was moved.
/// </summary>
public class SurplusTransfer
{
    public int     Id          { get; set; }
    public int     PaymentId   { get; set; }   // originating payment
    public int     StudentId   { get; set; }

    // ── Source (what credit is being moved FROM) ───────────────────────────
    /// <summary>Null for surplus-from-payment transfers. Set for standalone transfers.</summary>
    public PaymentItemType? SourceItemType     { get; set; }
    public int?             SourceReferenceId  { get; set; }  // Trip / CustomFee
    public int?             SourceTermMonthId  { get; set; }  // Transport month

    // ── Destination (what service the credit is being moved TO) ───────────
    public PaymentItemType TargetItemType    { get; set; }
    public int?            TargetReferenceId { get; set; }
    public int?            TargetTermMonthId { get; set; }

    public decimal Amount      { get; set; }
    public string? Reason      { get; set; }

    /// <summary>
    /// True when this was a standalone manual transfer (not a surplus-from-payment).
    /// Used to distinguish record types in the transfer log.
    /// </summary>
    public bool IsStandaloneTransfer { get; set; } = false;

    public DateTime TransferredAt    { get; set; } = DateTime.UtcNow;
    public string   TransferredById  { get; set; } = string.Empty;

    // ── Navigation ──────────────────────────────────────────────────────────
    public Payment         Payment       { get; set; } = null!;
    public ApplicationUser TransferredBy { get; set; } = null!;
}
