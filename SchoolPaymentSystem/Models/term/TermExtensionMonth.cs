namespace SchoolPaymentSystem.Models.term;

/// <summary>
/// An extra month added to a term beyond its original months.
/// For example, a Term 1 (Jan–Mar) could have April added as an extension.
/// Each extension month can be configured with per-grade fees.
/// </summary>
public class TermExtensionMonth
{
    public int    Id          { get; set; }
    public int    TermId      { get; set; }
    public int    MonthNumber { get; set; }   // 1=Jan … 12=Dec
    public string MonthName   { get; set; } = string.Empty;
    public bool   IsActive    { get; set; } = true;

    // ── Navigation ──────────────────────────────────────────────────────────
    public Term Term { get; set; } = null!;
    public ICollection<TermExtensionFee> ExtensionFees { get; set; } = [];
}
