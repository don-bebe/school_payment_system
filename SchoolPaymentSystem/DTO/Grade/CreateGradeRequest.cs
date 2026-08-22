namespace SchoolPaymentSystem.DTO.Grade;

public record CreateGradeRequest(
    string Name,
    int    Level,
    string? Description
    );