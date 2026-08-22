using Microsoft.EntityFrameworkCore;
using SchoolPaymentSystem.Data;
using SchoolPaymentSystem.DTO.Payment;
using SchoolPaymentSystem.Exceptions;
using SchoolPaymentSystem.Helpers;
using SchoolPaymentSystem.Models.payment;
using SchoolPaymentSystem.Services.Interfaces;

namespace SchoolPaymentSystem.Services;

public class ZigRateService : IZigRateService
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser         _currentUser;
    private readonly IAuditService        _audit;

    public ZigRateService(ApplicationDbContext db, ICurrentUser currentUser, IAuditService audit)
    {
        _db          = db;
        _currentUser = currentUser;
        _audit       = audit;
    }

    public async Task<ZigRateDto?> GetCurrentRateAsync()
    {
        var rate = await _db.ZigRate.AsNoTracking()
            .Include(z => z.SetBy)
            .Where(z => z.IsCurrent)
            .OrderByDescending(z => z.EffectiveFrom)
            .FirstOrDefaultAsync();

        return rate is null ? null : MapDto(rate);
    }

    public async Task<List<ZigRateDto>> GetRateHistoryAsync() =>
        await _db.ZigRate.AsNoTracking()
            .Include(z => z.SetBy)
            .OrderByDescending(z => z.EffectiveFrom)
            .Select(z => MapDto(z))
            .ToListAsync();

    public async Task<ZigRateDto> SetRateAsync(SetZigRateRequest request)
    {
        if (request.RatePerUsd <= 0)
            throw new ValidationException("ratePerUsd", "ZiG rate must be greater than zero.");

        // Close the previous current rate
        var previous = await _db.ZigRate.Where(z => z.IsCurrent).ToListAsync();
        foreach (var old in previous)
        {
            old.IsCurrent    = false;
            old.EffectiveTo  = DateTime.Now;
        }

        var newRate = new ZigRate
        {
            RatePerUsd    = request.RatePerUsd,
            EffectiveFrom = DateTime.Now,
            IsCurrent     = true,
            SetById       = _currentUser.UserId,
            SetAt         = DateTime.Now,
            Notes         = request.Notes
        };

        _db.ZigRate.Add(newRate);
        await _db.SaveChangesAsync();

        await _audit.LogAsync("SET_ZIG_RATE", "ZigRate", newRate.Id.ToString(),
            newValues: new { newRate.RatePerUsd, newRate.Notes });

        // Reload with nav property
        var saved = await _db.ZigRate.AsNoTracking()
            .Include(z => z.SetBy)
            .FirstAsync(z => z.Id == newRate.Id);

        return MapDto(saved);
    }

    public async Task<decimal> GetCurrentRateValueAsync()
    {
        var rate = await _db.ZigRate.AsNoTracking()
            .Where(z => z.IsCurrent)
            .Select(z => (decimal?)z.RatePerUsd)
            .FirstOrDefaultAsync();

        if (rate is null)
            throw new BusinessRuleException(
                "No ZiG exchange rate has been configured. " +
                "Please ask an administrator to set the current ZiG rate before recording ZiG payments.");

        return rate.Value;
    }

    public async Task<decimal> ConvertZigToUsdAsync(decimal amountZig)
    {
        var rate = await GetCurrentRateValueAsync();
        return Math.Round(amountZig / rate, 2);
    }

    private static ZigRateDto MapDto(ZigRate z) => new(
        z.Id,
        z.RatePerUsd,
        z.EffectiveFrom,
        z.EffectiveTo,
        z.IsCurrent,
        z.SetAt,
        $"{z.SetBy.FirstName} {z.SetBy.LastName}",
        z.Notes
    );
}