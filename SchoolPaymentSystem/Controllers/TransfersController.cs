using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolPaymentSystem.DTO.Payment;
using SchoolPaymentSystem.Helpers;
using SchoolPaymentSystem.Services.Interfaces;

namespace SchoolPaymentSystem.Controllers;

/// <summary>
/// Handles standalone credit transfers — moving a paid credit from one fee
/// type to another (e.g. advance transport payment → tuition, trip → project fee).
/// </summary>
[Authorize]
public class TransfersController : BaseController
{
    private readonly ITransferService _transfers;

    public TransfersController(ITransferService transfers)
    {
        _transfers = transfers;
    }

    // ── GET /api/transfers/transferable-credits ───────────────────────────────
    /// <summary>
    /// Returns all paid credit lines for the student in the given term that
    /// could be transferred to another service. Each row shows how much is
    /// available (some credit may have already been transferred).
    /// </summary>
    [HttpGet("transferable-credits")]
    [Authorize(Policy = "AdminOrReception")]
    [ProducesResponseType(typeof(List<TransferableCredit>), 200)]
    public async Task<IActionResult> GetTransferableCredits(
        [FromQuery] int studentId,
        [FromQuery] int academicYearId,
        [FromQuery] int termId)
    {
        var credits = await _transfers.GetTransferableCreditsAsync(studentId, academicYearId, termId);
        return Ok(credits);
    }

    // ── POST /api/transfers ───────────────────────────────────────────────────
    /// <summary>
    /// Transfer a credit amount from one fee type to another for a student.
    /// Admin only — this is a financial correction that affects the student's
    /// payment records and the audit trail.
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(StandaloneTransferResult), 201)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Transfer([FromBody] StandaloneTransferRequest request)
    {
        var result = await _transfers.TransferCreditAsync(request);
        return Created(result, $"Transfer of ${result.Amount:F2} from {result.SourceLabel} to {result.TargetLabel} completed.");
    }
}
