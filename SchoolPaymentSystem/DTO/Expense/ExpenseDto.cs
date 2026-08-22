namespace SchoolPaymentSystem.DTO.Expense;

public record ExpenseDto(
    int      Id,
    string   CategoryName,
    string   PaymentMethodName,
    string   PaymentMethodCode,
    string?  Reference,
    decimal  Amount,
    decimal  AmountUsd,
    decimal? ZigRateUsed,
    string   Currency,
    DateTime ExpenseDate,
    string?  Description,
    string   RecordedByName
    );