namespace SchoolPaymentSystem.DTO.Reports;

public record PaymentLineItemDto(
    int      Id,
    string   StudentName,
    string   StudentNumber,
    string   Grade,
    string   Term,
    string   PaymentMethod,
    string   PaymentMethodCode,
    string   Currency,
    decimal  AmountPaid,
    decimal  AmountUsd,
    decimal? ZigRateUsed,
    bool     IsPrepayment,
    string?  PrepaymentDescription,
    string?  Reference,
    DateTime PaymentDate,
    string   RecordedBy,
    string   ReceiptNumber
);