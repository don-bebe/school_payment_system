using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SchoolPaymentSystem.Data;
using SchoolPaymentSystem.DTO.Admin;
using SchoolPaymentSystem.Helpers;
using SchoolPaymentSystem.Models;
using SchoolPaymentSystem.Services.Interfaces;

namespace SchoolPaymentSystem.Services;

public class AuditService : IAuditService
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly ILogger<AuditService> _logger;

    public AuditService(ApplicationDbContext db, ICurrentUser currentUser, ILogger<AuditService> logger)
    {
        _db          = db;
        _currentUser = currentUser;
        _logger      = logger;
    }

    public async Task LogAsync(
        string action,
        string entityName,
        string? entityId    = null,
        object? oldValues   = null,
        object? newValues   = null,
        bool    success     = true,
        string? errorMessage = null)
    {
        try
        {
            var log = new AuditLog
            {
                UserId       = string.IsNullOrEmpty(_currentUser.UserId) ? null : _currentUser.UserId,
                UserName     = _currentUser.FullName,
                Action       = action,
                EntityName   = entityName,
                EntityId     = entityId,
                OldValues    = oldValues is null ? null : JsonSerializer.Serialize(oldValues),
                NewValues    = newValues is null ? null : JsonSerializer.Serialize(newValues),
                IpAddress    = _currentUser.IpAddress,
                Success      = success,
                ErrorMessage = errorMessage,
                Timestamp    = DateTime.Now
            };

            _db.AuditLog.Add(log);
            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // Audit failure must never crash the main operation
            _logger.LogError(ex, "Failed to write audit log: {Action} on {Entity}/{Id}",
                action, entityName, entityId);
        }
    }

    public async Task<PagedResult<AuditLogDto>> QueryAsync(AuditLogQueryRequest request)
    {
        var query = _db.AuditLog.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.UserId))
            query = query.Where(a => a.UserId == request.UserId);

        if (!string.IsNullOrWhiteSpace(request.Action))
            query = query.Where(a => a.Action.Contains(request.Action));

        if (!string.IsNullOrWhiteSpace(request.EntityName))
            query = query.Where(a => a.EntityName == request.EntityName);

        if (request.From.HasValue)
            query = query.Where(a => a.Timestamp >= request.From.Value);

        if (request.To.HasValue)
            query = query.Where(a => a.Timestamp <= request.To.Value);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(a => a.Timestamp)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(a => new AuditLogDto(
                a.Id, a.UserName, a.Action, a.EntityName,
                a.EntityId, a.OldValues, a.NewValues,
                a.IpAddress, a.Timestamp, a.Success, a.ErrorMessage))
            .ToListAsync();

        return new PagedResult<AuditLogDto>(
            items, total, request.Page, request.PageSize,
            (int)Math.Ceiling(total / (double)request.PageSize));
    }
}