namespace SchoolPaymentSystem.DTO.Reports;

public record ExpenseLineItemDto(
    int      Id,
    string   Category,
    string   Description,
    string   Currency,
    decimal  Amount,
    decimal  AmountUsd,
    decimal? ZigRateUsed,
    string?  PaymentMethod,
    DateTime ExpenseDate,
    string   RecordedBy
    );