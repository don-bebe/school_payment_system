namespace SchoolPaymentSystem.Models.fees;

/// <summary>
/// A purchasable uniform item managed by admin.
/// Gender controls which students see this item during a payment.
/// </summary>
public class UniformItem
{
    public int     Id       { get; set; }
    public string  Name     { get; set; } = string.Empty;   // e.g. "Boys Shirt", "Girls Skirt"
    public UniformGender Gender  { get; set; } = UniformGender.Both;
    public decimal Price    { get; set; }
    public bool    IsActive { get; set; } = true;

    // ── Navigation ──────────────────────────────────────────────────────────
    public ICollection<UniformPurchaseLine> PurchaseLines { get; set; } = [];
}

public enum UniformGender
{
    Boys,
    Girls,
    Both
}
