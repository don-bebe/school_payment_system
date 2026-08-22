namespace SchoolPaymentSystem.DTO.Notifications;

public record NotificationDto(
    int      Id,
    string   Title,
    string   Message,
    string   Type,
    string?  EntityName,
    string?  EntityId,
    bool     IsRead,
    DateTime CreatedAt,
    DateTime? ReadAt
    );