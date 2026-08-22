namespace SchoolPaymentSystem.Models.expenses;

public class ExpenseCategory
{
    public int    Id       { get; set; }
    public string Name     { get; set; } = string.Empty;  // "Salary"
    public string? Description { get; set; }
    public bool   IsActive { get; set; } = true;

    // ── Navigation ──────────────────────────────────────────────────────────
    public ICollection<Expense> Expenses { get; set; } = [];
}