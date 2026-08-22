using SchoolPaymentSystem.Models.user;

namespace SchoolPaymentSystem.Models.payment;

public class ZigRate
{
    public int     Id          { get; set; }

    /// <summary>How many ZiG equal 1 USD (e.g. 26.5 means ZiG 26.50 = USD 1).</summary>
    public decimal RatePerUsd  { get; set; }

    public DateTime EffectiveFrom { get; set; } = DateTime.Now;
    public DateTime? EffectiveTo  { get; set; }

    /// <summary>True for the currently active rate.</summary>
    public bool    IsCurrent   { get; set; } = true;

    public string  SetById     { get; set; } = string.Empty;
    public DateTime SetAt      { get; set; } = DateTime.Now;
    public string?  Notes      { get; set; }

    // ── Navigation ──────────────────────────────────────────────────────────
    public ApplicationUser SetBy { get; set; } = null!;
}