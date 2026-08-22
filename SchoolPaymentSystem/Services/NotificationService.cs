using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SchoolPaymentSystem.Data;
using SchoolPaymentSystem.DTO.Notifications;
using SchoolPaymentSystem.Models;
using SchoolPaymentSystem.Models.user;
using SchoolPaymentSystem.Services.Interfaces;

namespace SchoolPaymentSystem.Services;

public class NotificationService : INotificationService
{
    private readonly ApplicationDbContext _db;
    private readonly UserManager<ApplicationUser> _users;

    public NotificationService(ApplicationDbContext db, UserManager<ApplicationUser> users)
    {
        _db    = db;
        _users = users;
    }

    public async Task SendAsync(string userId, string title, string message,
        string type = "Info", string? entityName = null, string? entityId = null)
    {
        _db.Notification.Add(new Notification
        {
            UserId     = userId,
            Title      = title,
            Message    = message,
            Type       = type,
            EntityName = entityName,
            EntityId   = entityId,
            CreatedAt  = DateTime.Now
        });
        await _db.SaveChangesAsync();
    }

    public async Task SendToRoleAsync(string role, string title, string message,
        string type = "Info", string? entityName = null, string? entityId = null)
    {
        var usersInRole = await _users.GetUsersInRoleAsync(role);

        var notifications = usersInRole.Select(u => new Notification
        {
            UserId     = u.Id,
            Title      = title,
            Message    = message,
            Type       = type,
            EntityName = entityName,
            EntityId   = entityId,
            CreatedAt  = DateTime.Now
        }).ToList();

        await _db.Notification.AddRangeAsync(notifications);
        await _db.SaveChangesAsync();
    }

    public async Task<List<NotificationDto>> GetForUserAsync(string userId, bool unreadOnly = false)
    {
        var q = _db.Notification.AsNoTracking()
            .Where(n => n.UserId == userId);

        if (unreadOnly)
            q = q.Where(n => !n.IsRead);

        return await q.OrderByDescending(n => n.CreatedAt)
            .Select(n => new NotificationDto(
                n.Id, n.Title, n.Message, n.Type,
                n.EntityName, n.EntityId,
                n.IsRead, n.CreatedAt, n.ReadAt))
            .ToListAsync();
    }

    public async Task<int> GetUnreadCountAsync(string userId) =>
        await _db.Notification.CountAsync(n => n.UserId == userId && !n.IsRead);

    public async Task MarkReadAsync(int notificationId, string userId)
    {
        var n = await _db.Notification
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);
        if (n is null) return;
        n.IsRead = true;
        n.ReadAt = DateTime.Now;
        await _db.SaveChangesAsync();
    }

    public async Task MarkAllReadAsync(string userId)
    {
        await _db.Notification
            .Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(s => s
                .SetProperty(n => n.IsRead, true)
                .SetProperty(n => n.ReadAt, DateTime.Now));
    }
}