using SchoolPaymentSystem.DTO.Notifications;

namespace SchoolPaymentSystem.Services.Interfaces;

public interface INotificationService
{
    Task SendAsync(string userId, string title, string message,
        string type = "Info", string? entityName = null, string? entityId = null);

    /// <summary>Broadcast the same notification to all users with the given role.</summary>
    Task SendToRoleAsync(string role, string title, string message,
        string type = "Info", string? entityName = null, string? entityId = null);

    Task<List<NotificationDto>> GetForUserAsync(string userId, bool unreadOnly = false);
    Task<int>                   GetUnreadCountAsync(string userId);
    Task                        MarkReadAsync(int notificationId, string userId);
    Task                        MarkAllReadAsync(string userId);
}