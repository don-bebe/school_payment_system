using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolPaymentSystem.Data;
using SchoolPaymentSystem.DTO.Admin;
using SchoolPaymentSystem.DTO.Payment;
using SchoolPaymentSystem.Services.Interfaces;
using SchoolPaymentSystem.Helpers;
using SchoolPaymentSystem.Models;
using SchoolPaymentSystem.Models.payment;

namespace SchoolPaymentSystem.Controllers;

[Authorize(Policy = "AdminOnly")]
[Route("api/admin")]
public class AdminController : BaseController
{
    private readonly IAuditService _audit;
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IZigRateService _zigRate;

    public AdminController(
        IAuditService audit,
        ApplicationDbContext db,
        ICurrentUser currentUser,
        IZigRateService zigRate)
    {
        _audit       = audit;
        _db          = db;
        _currentUser = currentUser;
        _zigRate     = zigRate;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // AUDIT LOGS
    // ══════════════════════════════════════════════════════════════════════════

    // ── GET /api/admin/audit-logs ─────────────────────────────────────────────
    /// <summary>
    /// Query the audit log with optional filters:
    /// userId, action keyword, entity name, date range.
    /// Returns a paged result ordered newest-first.
    /// </summary>
    [HttpGet("audit-logs")]
    [ProducesResponseType(typeof(PagedResult<AuditLogDto>), 200)]
    public async Task<IActionResult> GetAuditLogs([FromQuery] AuditLogQueryRequest request)
    {
        var result = await _audit.QueryAsync(request);
        return Ok(result);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SYSTEM SETTINGS
    // ══════════════════════════════════════════════════════════════════════════

    // ── GET /api/admin/settings ───────────────────────────────────────────────
    /// <summary>List all system settings (school name, receipt prefix, etc.).</summary>
    [HttpGet("settings")]
    [ProducesResponseType(typeof(List<SystemSettingDto>), 200)]
    public async Task<IActionResult> GetSettings()
    {
        var settings = await _db.SystemSetting.AsNoTracking()
            .Include(s => s.UpdatedBy)
            .OrderBy(s => s.Key)
            .Select(s => new SystemSettingDto(
                s.Id, s.Key, s.Value, s.Description,
                s.DataType, s.UpdatedAt,
                s.UpdatedBy.FirstName + " " + s.UpdatedBy.LastName))
            .ToListAsync();

        return Ok(settings);
    }

    // ── GET /api/admin/settings/{key} ─────────────────────────────────────────
    /// <summary>Retrieve a single setting by its key.</summary>
    [HttpGet("settings/{key}")]
    [ProducesResponseType(typeof(SystemSettingDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetSetting(string key)
    {
        var setting = await _db.SystemSetting.AsNoTracking()
            .Include(s => s.UpdatedBy)
            .FirstOrDefaultAsync(s => s.Key == key);

        if (setting is null)
            return NotFound(ApiResponse.Fail($"Setting '{key}' not found."));

        return Ok(new SystemSettingDto(
            setting.Id, setting.Key, setting.Value, setting.Description,
            setting.DataType, setting.UpdatedAt,
            setting.UpdatedBy.FirstName + " " + setting.UpdatedBy.LastName));
    }

    // ── PUT /api/admin/settings ───────────────────────────────────────────────
    /// <summary>
    /// Upsert a system setting.
    /// Creates the row if the key does not exist; updates it if it does.
    /// </summary>
    [HttpPut("settings")]
    [ProducesResponseType(200)]
    public async Task<IActionResult> UpsertSetting([FromBody] UpdateSystemSettingRequest request)
    {
        var existing = await _db.SystemSetting
            .FirstOrDefaultAsync(s => s.Key == request.Key);

        if (existing is null)
        {
            _db.SystemSetting.Add(new SystemSetting
            {
                Key         = request.Key,
                Value       = request.Value,
                UpdatedAt   = DateTime.Now,
                UpdatedById = _currentUser.UserId
            });
        }
        else
        {
            existing.Value       = request.Value;
            existing.UpdatedAt   = DateTime.Now;
            existing.UpdatedById = _currentUser.UserId;
        }

        await _db.SaveChangesAsync();
        await _audit.LogAsync("UPSERT_SETTING", "SystemSetting", request.Key,
            newValues: new { request.Key, request.Value });

        return NoContent($"Setting '{request.Key}' saved.");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PAYMENT METHODS  (admin management view — includes inactive)
    // ══════════════════════════════════════════════════════════════════════════

    // ── GET /api/admin/payment-methods ────────────────────────────────────────
    /// <summary>List all payment methods, including deactivated ones.</summary>
    [HttpGet("payment-methods")]
    [ProducesResponseType(200)]
    public async Task<IActionResult> GetPaymentMethods()
    {
        var methods = await _db.PaymentMethod.AsNoTracking()
            .OrderBy(m => m.Name)
            .Select(m => new
            {
                m.Id, m.Name, m.Code,
                m.RequiresReference, m.IsActive
            })
            .ToListAsync();

        return Ok(methods);
    }

    // ── POST /api/admin/payment-methods ───────────────────────────────────────
    /// <summary>Add a new payment method (e.g. a new mobile-money provider).</summary>
    [HttpPost("payment-methods")]
    [ProducesResponseType(201)]
    [ProducesResponseType(409)]
    public async Task<IActionResult> CreatePaymentMethod(
        [FromBody] CreatePaymentMethodRequest request)
    {
        if (await _db.PaymentMethod.AnyAsync(m => m.Code == request.Code))
            return Conflict(ApiResponse.Fail($"Payment method with code '{request.Code}' already exists."));

        var method = new PaymentMethod
        {
            Name               = request.Name,
            Code               = request.Code.ToUpperInvariant(),
            RequiresReference  = request.RequiresReference,
            IsActive           = true
        };

        _db.PaymentMethod.Add(method);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("CREATE_PAYMENT_METHOD", "PaymentMethod",
            method.Id.ToString(), newValues: new { method.Name, method.Code });

        return Created(new { method.Id, method.Name, method.Code,
            method.RequiresReference, method.IsActive }, "Payment method created.");
    }

    // ── PUT /api/admin/payment-methods/{id} ───────────────────────────────────
    /// <summary>
    /// Update a payment method's name, reference requirement, or active status.
    /// Code (the internal key) cannot be changed after creation.
    /// </summary>
    [HttpPut("payment-methods/{id:int}")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> UpdatePaymentMethod(
        int id, [FromBody] UpdatePaymentMethodRequest request)
    {
        var method = await _db.PaymentMethod.FindAsync(id);
        if (method is null)
            return NotFound(ApiResponse.Fail($"Payment method {id} not found."));

        var old = new { method.Name, method.RequiresReference, method.IsActive };
        method.Name              = request.Name;
        method.RequiresReference = request.RequiresReference;
        method.IsActive          = request.IsActive;

        await _db.SaveChangesAsync();
        await _audit.LogAsync("UPDATE_PAYMENT_METHOD", "PaymentMethod", id.ToString(),
            old, new { method.Name, method.IsActive });

        return NoContent("Payment method updated.");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ZIG EXCHANGE RATE
    // ══════════════════════════════════════════════════════════════════════════

    // ── GET /api/admin/zig-rate ───────────────────────────────────────────────
    /// <summary>Returns the currently active ZiG/USD rate. Accessible to all authenticated staff.</summary>
    [HttpGet("zig-rate")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(ZigRateDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetCurrentZigRate()
    {
        var rate = await _zigRate.GetCurrentRateAsync();
        if (rate is null)
            return NotFound(ApiResponse.Fail("No ZiG rate has been configured yet."));
        return Ok(rate);
    }

    // ── GET /api/admin/zig-rate/history ───────────────────────────────────────
    /// <summary>Returns the full ZiG rate history, newest first.</summary>
    [HttpGet("zig-rate/history")]
    [ProducesResponseType(typeof(List<ZigRateDto>), 200)]
    public async Task<IActionResult> GetZigRateHistory()
    {
        var history = await _zigRate.GetRateHistoryAsync();
        return Ok(history);
    }

    // ── POST /api/admin/zig-rate ──────────────────────────────────────────────
    /// <summary>
    /// Set a new weekly ZiG rate. Closes the current rate and opens the new one immediately.
    /// </summary>
    [HttpPost("zig-rate")]
    [ProducesResponseType(typeof(ZigRateDto), 201)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> SetZigRate([FromBody] SetZigRateRequest request)
    {
        var rate = await _zigRate.SetRateAsync(request);
        return Created(rate, $"ZiG rate set to {rate.RatePerUsd} ZiG/USD.");
    }
}