namespace SchoolPaymentSystem.DTO.Expense;

public record CreateExpenseCategoryRequest(
    string  Name,
    string? Description
    );