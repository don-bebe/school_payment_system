using SchoolPaymentSystem.DTO.Admin;

namespace SchoolPaymentSystem.Services.Interfaces;

public interface IAuditService
{
    Task LogAsync(
        string action,
        string entityName,
        string? entityId    = null,
        object? oldValues   = null,
        object? newValues   = null,
        bool    success     = true,
        string? errorMessage = null);

    Task<PagedResult<AuditLogDto>> QueryAsync(AuditLogQueryRequest request);
}