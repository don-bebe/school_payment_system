namespace SchoolPaymentSystem.DTO.Grade;

public record TermDto(
    int      Id,
    int      AcademicYearId,
    string   AcademicYearName,
    int      TermNumber,
    string   Name,
    DateTime StartDate,
    DateTime EndDate,
    bool     IsActive,
    List<TermMonthDto> Months
    );