namespace SchoolPaymentSystem.DTO.Reports;

public record DateRangeReportRequest(
    DateTime From,
    DateTime To,
    int?     AcademicYearId,
    int?     TermId
    );