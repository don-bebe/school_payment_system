using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolPaymentSystem.DTO.Notifications;
using SchoolPaymentSystem.Services.Interfaces;

namespace SchoolPaymentSystem.Controllers;

[Authorize(Policy = "AnyStaff")]
[Route("api/dashboard")]
public class DashboardController : BaseController
{
    private readonly IDashboardService _dashboard;

    public DashboardController(IDashboardService dashboard) => _dashboard = dashboard;

    /// <summary>
    /// Returns everything the Electron frontend needs to render the
    /// main dashboard screen in a single round trip.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(DashboardSummaryDto), 200)]
    public async Task<IActionResult> Get()
    {
        var summary = await _dashboard.GetSummaryAsync();
        return Ok(summary);
    }
}