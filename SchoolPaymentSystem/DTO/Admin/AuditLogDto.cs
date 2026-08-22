namespace SchoolPaymentSystem.DTO.Admin;

public record AuditLogDto(
    long     Id,
    string   UserName,
    string   Action,
    string   EntityName,
    string?  EntityId,
    string?  OldValues,
    string?  NewValues,
    string?  IpAddress,
    DateTime Timestamp,
    bool     Success,
    string?  ErrorMessage
    );