using SchoolPaymentSystem.DTO.Payment;

namespace SchoolPaymentSystem.Services.Interfaces;

public interface IZigRateService
{
    Task<ZigRateDto?> GetCurrentRateAsync();

    /// <summary>Returns the full rate history, newest first.</summary>
    Task<List<ZigRateDto>> GetRateHistoryAsync();
    
    Task<ZigRateDto> SetRateAsync(SetZigRateRequest request);
    Task<decimal> ConvertZigToUsdAsync(decimal amountZig);

    /// <summary>Returns the current rate value (RatePerUsd), throws if not set.</summary>
    Task<decimal> GetCurrentRateValueAsync();
}