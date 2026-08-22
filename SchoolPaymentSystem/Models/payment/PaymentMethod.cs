using SchoolPaymentSystem.Models.expenses;

namespace SchoolPaymentSystem.Models.payment;

public class PaymentMethod
{
    public int    Id           { get; set; }
    public string Name         { get; set; } = string.Empty;  // "EcoCash", "ZiG", "Cash"
    public string Code         { get; set; } = string.Empty;  // "ECOCASH", "ZIG", "CASH"

    /// <summary>If true, a Reference field is required on every Payment.</summary>
    public bool   RequiresReference { get; set; } = false;

    public bool   IsActive     { get; set; } = true;

    // ── Navigation ──────────────────────────────────────────────────────────
    public ICollection<Payment> Payments { get; set; } = [];
    public ICollection<Expense> Expenses { get; set; } = [];
}