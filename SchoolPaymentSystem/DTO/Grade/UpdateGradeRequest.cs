namespace SchoolPaymentSystem.DTO.Grade;

public record UpdateGradeRequest(
    string  Name,
    string? Description,
    bool    IsActive
    );