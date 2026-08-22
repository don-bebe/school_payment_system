namespace SchoolPaymentSystem.DTO.Grade;

public record CreateAcademicYearRequest(
    int  Year,
    string Name,
    bool PromoteStudents = true  // trigger auto-promotion
    );