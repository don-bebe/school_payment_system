namespace SchoolPaymentSystem.DTO.Grade;

public record AcademicYearDto(
    int      Id,
    int      Year,
    string   Name,
    bool     IsActive,
    DateTime CreatedAt
    );