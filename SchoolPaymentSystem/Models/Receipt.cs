using SchoolPaymentSystem.Models.payment;
using SchoolPaymentSystem.Models.user;

namespace SchoolPaymentSystem.Models;

public class Receipt
{
    public int      Id            { get; set; }
    public int      PaymentId     { get; set; }
    public string   ReceiptNumber { get; set; } = string.Empty;
    public DateTime IssuedAt      { get; set; } = DateTime.Now;
    public string   IssuedById    { get; set; } = string.Empty;   // ApplicationUser.Id
    public bool     IsPrinted     { get; set; } = false;
    public DateTime? PrintedAt    { get; set; }

    // ── Navigation ──────────────────────────────────────────────────────────
    public Payment         Payment  { get; set; } = null!;
    public ApplicationUser IssuedBy { get; set; } = null!;
}