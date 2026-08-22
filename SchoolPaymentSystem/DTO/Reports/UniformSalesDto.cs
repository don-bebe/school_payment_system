namespace SchoolPaymentSystem.DTO.Reports;

public record UniformSalesRow(
    int    PurchaseLineId,
    int    StudentId,
    string StudentName,
    string StudentNumber,
    int    PaymentId,
    string ReceiptNumber,
    string ItemName,
    int    Quantity,
    decimal UnitPrice,
    decimal TotalPrice,
    DateTime PurchasedAt,
    string RecordedBy
);

public record UniformSalesRequest(
    DateTime? From,
    DateTime? To,
    int?      GradeId,
    int?      AcademicYearId
);
