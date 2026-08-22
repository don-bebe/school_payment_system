using SchoolPaymentSystem.DTO.Notifications;

namespace SchoolPaymentSystem.Services.Interfaces;

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync();
}