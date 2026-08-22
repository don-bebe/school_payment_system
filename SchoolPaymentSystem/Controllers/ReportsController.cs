using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolPaymentSystem.Data;
using SchoolPaymentSystem.DTO.Reports;
using SchoolPaymentSystem.Services.Interfaces;

namespace SchoolPaymentSystem.Controllers;

[Authorize(Policy = "AnyStaff")]
[Route("api/reports")]
public class ReportsController : BaseController
{
    private readonly IReportService          _reports;
    private readonly ApplicationDbContext    _db;

    public ReportsController(IReportService reports, ApplicationDbContext db)
    {
        _reports = reports;
        _db      = db;
    }

    [HttpGet("daily")]
    public async Task<IActionResult> Daily(
        [FromQuery] DateTime? date = null, [FromQuery] int? academicYearId = null)
    {
        var report = await _reports.GetDailyReportAsync(
            new DailyReportRequest(date ?? DateTime.Now.Date, academicYearId));
        return Ok(report);
    }

    [HttpGet("range")]
    public async Task<IActionResult> Range(
        [FromQuery] DateTime from, [FromQuery] DateTime to,
        [FromQuery] int? academicYearId = null, [FromQuery] int? termId = null)
    {
        var report = await _reports.GetRangeReportAsync(
            new DateRangeReportRequest(from, to, academicYearId, termId));
        return Ok(report);
    }

    [HttpGet("arrears")]
    public async Task<IActionResult> Arrears(
        [FromQuery] int academicYearId, [FromQuery] int termId, [FromQuery] int? gradeId = null)
    {
        var report = await _reports.GetArrearsReportAsync(
            new ArrearsReportRequest(academicYearId, termId, gradeId));
        return Ok(report);
    }

    [HttpGet("transport")]
    public async Task<IActionResult> Transport(
        [FromQuery] int? termId = null, [FromQuery] int? gradeId = null,
        [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
    {
        var result = await _reports.GetTransportReportAsync(
            new TransportReportRequest(from, to, gradeId, termId));
        return Ok(result);
    }

    [HttpGet("trips")]
    public async Task<IActionResult> Trips(
        [FromQuery] int? termId = null, [FromQuery] int? tripSettingId = null,
        [FromQuery] int? gradeId = null,
        [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
    {
        var result = await _reports.GetTripReportAsync(
            new TripReportRequest(from, to, gradeId, termId, tripSettingId));
        return Ok(result);
    }

    [HttpGet("transfers")]
    public async Task<IActionResult> Transfers(
        [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
    {
        var result = await _reports.GetTransferLogAsync(from, to);
        return Ok(result);
    }

    [HttpGet("uniforms")]
    public async Task<IActionResult> UniformSales(
        [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null,
        [FromQuery] int? gradeId = null, [FromQuery] int? academicYearId = null)
    {
        var result = await _reports.GetUniformSalesAsync(
            new UniformSalesRequest(from, to, gradeId, academicYearId));
        return Ok(result);
    }

    [HttpGet("student-statement/{studentId:int}")]
    public async Task<IActionResult> StudentStatement(
        int studentId, [FromQuery] int? academicYearId = null)
    {
        var result = await _reports.GetStudentStatementAsync(studentId, academicYearId);
        return Ok(result);
    }

    [HttpGet("standalone-fees")]
    public async Task<IActionResult> StandaloneFees(
        [FromQuery] int academicYearId,
        [FromQuery] string feeType = "all")
    {
        var result = await _reports.GetStandaloneFeesReportAsync(
            new StandaloneFeesReportRequest(academicYearId, feeType.ToLower()));
        return Ok(result);
    }

    // ── GET /api/reports/school-settings ─────────────────────────────────────
    /// <summary>
    /// Returns the read-only school settings (name, logo, motto, address, etc.)
    /// needed by all staff to render receipts and print reports correctly.
    /// Accessible to all authenticated staff — the write endpoint remains Admin-only.
    /// </summary>
    [HttpGet("school-settings")]
    public async Task<IActionResult> GetSchoolSettings()
    {
        var settings = await _db.SystemSetting.AsNoTracking()
            .Select(s => new { s.Key, s.Value })
            .ToListAsync();
        return Ok(settings);
    }
}
