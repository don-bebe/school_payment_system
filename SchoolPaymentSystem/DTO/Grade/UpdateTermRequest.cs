namespace SchoolPaymentSystem.DTO.Grade;

public record UpdateTermRequest(
    string   Name,
    DateTime StartDate,
    DateTime EndDate,
    bool     IsActive
    );