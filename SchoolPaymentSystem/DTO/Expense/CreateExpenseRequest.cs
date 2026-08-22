namespace SchoolPaymentSystem.DTO.Expense;

public record CreateExpenseRequest(
    int      AcademicYearId,
    int      ExpenseCategoryId,
    int      PaymentMethodId,
    decimal  Amount,
    string   Currency,         // "USD" | "ZIG"
    DateTime ExpenseDate,
    string?  Description,

    /// <summary>EcoCash / ZiG transaction reference (when applicable).</summary>
    string?  Reference
    );