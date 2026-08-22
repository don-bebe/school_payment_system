using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolPaymentSystem.DTO.Notifications;
using SchoolPaymentSystem.Services.Interfaces;

namespace SchoolPaymentSystem.Controllers;

[Authorize(Policy = "AnyStaff")]
[Route("api/notifications")]
public class NotificationsController : BaseController
{
    private readonly INotificationService _notifications;

    public NotificationsController(INotificationService notifications)
        => _notifications = notifications;

    /// <summary>All notifications for the logged-in user, newest first.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<NotificationDto>), 200)]
    public async Task<IActionResult> GetAll()
    {
        var items = await _notifications.GetForUserAsync(CurrentUserId);
        return Ok(items);
    }

    /// <summary>Unread notifications only — used to populate the bell dropdown.</summary>
    [HttpGet("unread")]
    [ProducesResponseType(typeof(List<NotificationDto>), 200)]
    public async Task<IActionResult> GetUnread()
    {
        var items = await _notifications.GetForUserAsync(CurrentUserId, unreadOnly: true);
        return Ok(items);
    }

    /// <summary>Returns a single integer — the unread badge count.</summary>
    [HttpGet("count")]
    [ProducesResponseType(typeof(int), 200)]
    public async Task<IActionResult> GetUnreadCount()
    {
        var count = await _notifications.GetUnreadCountAsync(CurrentUserId);
        return Ok(count);
    }

    /// <summary>Mark a single notification as read.</summary>
    [HttpPut("{id:int}/read")]
    [ProducesResponseType(200)]
    public async Task<IActionResult> MarkRead(int id)
    {
        await _notifications.MarkReadAsync(id, CurrentUserId);
        return NoContent("Notification marked as read.");
    }

    /// <summary>Mark every unread notification as read for the current user.</summary>
    [HttpPut("read-all")]
    [ProducesResponseType(200)]
    public async Task<IActionResult> MarkAllRead()
    {
        await _notifications.MarkAllReadAsync(CurrentUserId);
        return NoContent("All notifications marked as read.");
    }
}