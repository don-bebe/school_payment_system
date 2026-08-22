namespace SchoolPaymentSystem.DTO.Reports;

public record StudentStatementDto(
    int      StudentId,
    string   StudentName,
    string   StudentNumber,
    string   GradeName,
    string   AcademicYear,
    decimal  TotalPaid,
    decimal  TotalDue,
    decimal  Balance,
    List<StatementPaymentRow> Payments
);

public record StatementPaymentRow(
    int      PaymentId,
    string   ReceiptNumber,
    DateTime PaymentDate,
    string   PaymentMethod,
    string   Currency,
    decimal  AmountPaid,
    decimal  AmountUsd,
    decimal? ZigRateUsed,
    string   TermName,
    string   RecordedBy,
    string   Status,
    List<StatementBreakdownLine> Lines,
    List<StatementUniformLine>   UniformLines
);

public record StatementBreakdownLine(
    string  Label,
    decimal AmountDue,
    decimal AmountPaid,
    string  Status
);

public record StatementUniformLine(
    string  ItemName,
    int     Quantity,
    decimal UnitPrice,
    decimal TotalPrice
);
