namespace SchoolPaymentSystem.DTO.Reports;

public record TransportPaymentDto(
    int      PaymentId,
    string   StudentName,
    string   StudentNumber,
    string   GradeName,
    string   MonthName,
    decimal  AmountPaid,
    string   Currency,
    string   PaymentMethod,
    DateTime PaidAt
);
