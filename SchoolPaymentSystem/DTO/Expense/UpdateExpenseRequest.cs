namespace SchoolPaymentSystem.DTO.Expense;

public record UpdateExpenseRequest(
    int      ExpenseCategoryId,
    int      PaymentMethodId,
    decimal  Amount,
    string   Currency,
    DateTime ExpenseDate,
    string?  Description,
    string?  Reference
    );