namespace SchoolPaymentSystem.Models.term;

/// <summary>
/// Optional per-month tuition override for a TermFee (term + grade combination).
/// When present for a given TermMonth, the system uses this amount as the due for
/// that month instead of the flat (TuitionAmount ÷ monthCount) split.
///
/// Example: Term 2 ECD A has TuitionAmount = $90 across 3 months, but July should
/// be $35 instead of $30 — add a TermMonthFee row for the July TermMonth with
/// OverrideAmount = 35.
///
/// Note: The TermFee.TuitionAmount is kept as the "nominal total" for reference but
/// the actual sum billed is the sum of all effective per-month amounts (either
/// the flat split or the override, whichever applies).
/// </summary>
public class TermMonthFee
{
    public int     Id          { get; set; }
    public int     TermFeeId   { get; set; }
    public int     TermMonthId { get; set; }

    /// <summary>
    /// The tuition amount due for this specific month (overrides the flat-split default).
    /// </summary>
    public decimal OverrideAmount { get; set; }

    // ── Navigation ────────────────────────────────────────────────────────────
    public TermFee   TermFee   { get; set; } = null!;
    public TermMonth TermMonth { get; set; } = null!;
}
