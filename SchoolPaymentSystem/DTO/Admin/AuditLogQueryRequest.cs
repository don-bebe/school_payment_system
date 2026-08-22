namespace SchoolPaymentSystem.DTO.Admin;

public record AuditLogQueryRequest(
    string?  UserId,
    string?  Action,
    string?  EntityName,
    DateTime? From,
    DateTime? To,
    int      Page     = 1,
    int      PageSize = 50
    );