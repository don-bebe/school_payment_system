namespace SchoolPaymentSystem.DTO.Reports;

public record TripPaymentDto(
    int      PaymentId,
    string   StudentName,
    string   StudentNumber,
    string   GradeName,
    string   TripName,
    decimal  AmountPaid,
    string   Currency,
    string   PaymentMethod,
    DateTime PaidAt
);
