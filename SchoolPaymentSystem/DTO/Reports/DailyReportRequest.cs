namespace SchoolPaymentSystem.DTO.Reports;

public record DailyReportRequest(
    DateTime Date,
    int?     AcademicYearId
    );