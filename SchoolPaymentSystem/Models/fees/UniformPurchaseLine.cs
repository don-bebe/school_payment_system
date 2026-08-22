using SchoolPaymentSystem.Models.payment;

namespace SchoolPaymentSystem.Models.fees;

/// <summary>
/// One line on a uniform purchase — links a Payment to a specific UniformItem.
/// A single payment can include multiple uniform items, each with its own line.
/// </summary>
public class UniformPurchaseLine
{
    public int     Id            { get; set; }
    public int     PaymentId     { get; set; }
    public int     UniformItemId { get; set; }
    public int     Quantity      { get; set; } = 1;
    public decimal UnitPrice     { get; set; }   // snapshot of price at time of purchase
    public decimal TotalPrice    { get; set; }   // Quantity × UnitPrice

    // ── Navigation ──────────────────────────────────────────────────────────
    public Payment     Payment     { get; set; } = null!;
    public UniformItem UniformItem { get; set; } = null!;
}
