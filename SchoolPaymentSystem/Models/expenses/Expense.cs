using SchoolPaymentSystem.Models.payment;
using SchoolPaymentSystem.Models.term;
using SchoolPaymentSystem.Models.user;

namespace SchoolPaymentSystem.Models.expenses;

public class Expense
{
    public int     Id               { get; set; }
    public int     AcademicYearId   { get; set; }
    public int     ExpenseCategoryId { get; set; }
    public int     PaymentMethodId  { get; set; }

    public decimal Amount           { get; set; }
    public string  Currency         { get; set; } = "USD";

    /// <summary>Always stored in USD. For USD expenses equals Amount; for ZiG = Amount / ZigRateUsed.</summary>
    public decimal AmountUsd        { get; set; }

    /// <summary>The ZiG/USD rate applied at time of recording (null for USD expenses).</summary>
    public decimal? ZigRateUsed     { get; set; }
    public DateTime ExpenseDate     { get; set; } = DateTime.UtcNow;
    public string? Description      { get; set; }
    
    public string? Reference        { get; set; }

    public string  RecordedById     { get; set; } = string.Empty;

    // ── Navigation ──────────────────────────────────────────────────────────
    public AcademicYear     AcademicYear     { get; set; } = null!;
    public ExpenseCategory  ExpenseCategory  { get; set; } = null!;
    public PaymentMethod    PaymentMethod    { get; set; } = null!;
    public ApplicationUser  RecordedBy       { get; set; } = null!;
}