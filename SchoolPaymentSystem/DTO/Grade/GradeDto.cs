namespace SchoolPaymentSystem.DTO.Grade;

public record GradeDto(
    int    Id,
    string Name,
    int    Level,
    string? Description,
    bool   IsActive
    );