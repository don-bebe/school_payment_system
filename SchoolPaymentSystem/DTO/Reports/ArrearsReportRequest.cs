namespace SchoolPaymentSystem.DTO.Reports;

public record ArrearsReportRequest(
    int  AcademicYearId,
    int  TermId,
    int? GradeId
    );