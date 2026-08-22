namespace SchoolPaymentSystem.DTO.Grade;

public record CreateTermRequest(
    int      AcademicYearId,
    int      TermNumber,
    string   Name,
    DateTime StartDate,
    DateTime EndDate,
    List<int> MonthNumbers 
    );