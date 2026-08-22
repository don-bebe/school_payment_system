namespace SchoolPaymentSystem.DTO.Reports;

public record ArrearsReportDto(
    string   AcademicYear,
    string   TermName,
    string?  GradeName,
    int      TotalStudents,
    int      StudentsOwing,
    decimal  TotalFees,
    decimal  TotalPaid,
    decimal  TotalOwing,
    List<StudentArrearsDto> Students
    );