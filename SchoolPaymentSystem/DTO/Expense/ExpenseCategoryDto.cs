namespace SchoolPaymentSystem.DTO.Expense;

public record ExpenseCategoryDto(
    int    Id,
    string Name,
    string? Description,
    bool   IsActive
    );