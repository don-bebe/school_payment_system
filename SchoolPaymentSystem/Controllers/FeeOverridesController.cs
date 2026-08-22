using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolPaymentSystem.Helpers;
using SchoolPaymentSystem.Services.Interfaces;

namespace SchoolPaymentSystem.Controllers;

/// <summary>
/// Manages per-student fee overrides:
///   - Flat monthly rate overrides (e.g. student pays $25 instead of $50)
///   - Single-month sports achievement discounts
///   - Sibling discount reassignment (move discount to a lower-grade child)
/// </summary>
[Authorize(Policy = "AdminOnly")]
[Route("api/fee-overrides")]
public class FeeOverridesController : BaseController
{
    private readonly IFeeRuleService _feeRules;
    private readonly ICurrentUser    _currentUser;

    public FeeOverridesController(IFeeRuleService feeRules, ICurrentUser currentUser)
    {
        _feeRules    = feeRules;
        _currentUser = currentUser;
    }

    // ── GET /api/fee-overrides?studentId=X&academicYearId=Y ──────────────────
    /// <summary>Returns all active fee overrides for a student in a given academic year.</summary>
    [HttpGet]
    [Authorize(Policy = "AnyStaff")]
    public async Task<IActionResult> GetOverrides(
        [FromQuery] int studentId,
        [FromQuery] int academicYearId)
    {
        var overrides = await _feeRules.GetFeeOverridesAsync(studentId, academicYearId);
        return Ok(overrides.Select(o => new
        {
            o.Id,
            o.StudentId,
            o.AcademicYearId,
            o.TermMonthId,
            TermMonthName = o.TermMonth?.MonthName,
            o.OverrideTuitionAmount,
            o.ForceStaffChildRate,
            o.Reason,
            o.CreatedAt
        }));
    }

    // ── POST /api/fee-overrides ───────────────────────────────────────────────
    /// <summary>
    /// Creates (or replaces) a fee override for a student.
    ///
    /// Scenarios:
    ///   1. Flat term rate: TermMonthId=null, OverrideTuitionAmount=25  → $25/month all term
    ///   2. Sports month:   TermMonthId=5,    OverrideTuitionAmount=0   → free for April only
    ///   3. Sibling redir:  TermMonthId=null, ForceStaffChildRate=true  → this child gets discount
    ///   4. Per-month flat: TermMonthId=5,    OverrideTuitionAmount=30  → $30 for April only
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateOverride([FromBody] CreateFeeOverrideRequest request)
    {
        if (request.OverrideTuitionAmount is null && !request.ForceStaffChildRate)
            return BadRequest(ApiResponse.Fail(
                "Specify either OverrideTuitionAmount or ForceStaffChildRate=true."));

        var result = await _feeRules.UpsertFeeOverrideAsync(
            request.StudentId,
            request.AcademicYearId,
            request.TermMonthId,
            request.OverrideTuitionAmount,
            request.ForceStaffChildRate,
            request.Reason ?? "Manual override",
            _currentUser.UserId);

        return Created(new { result.Id }, "Fee override saved.");
    }

    // ── DELETE /api/fee-overrides/{id} ────────────────────────────────────────
    /// <summary>Removes (deactivates) a fee override. The student reverts to standard rates.</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteOverride(int id)
    {
        await _feeRules.DeleteFeeOverrideAsync(id);
        return NoContent("Fee override removed.");
    }
}

public record CreateFeeOverrideRequest(
    int      StudentId,
    int      AcademicYearId,
    /// <summary>Null = applies for the whole term. Set = applies only for this month.</summary>
    int?     TermMonthId,
    /// <summary>
    /// Fixed tuition amount for the period. Set to 0 for a full discount.
    /// Null if you only want to reassign the staff-child rate (use ForceStaffChildRate instead).
    /// </summary>
    decimal? OverrideTuitionAmount,
    /// <summary>
    /// When true, this student receives the staff-child/sibling discount rate,
    /// regardless of grade level. Useful when a parent wants the lower-grade child
    /// to be the one getting the sibling discount.
    /// </summary>
    bool     ForceStaffChildRate,
    string?  Reason
);
