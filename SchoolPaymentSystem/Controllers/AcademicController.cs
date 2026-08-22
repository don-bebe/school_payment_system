using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolPaymentSystem.Data;
using SchoolPaymentSystem.DTO.Fees;
using SchoolPaymentSystem.DTO.Grade;
using SchoolPaymentSystem.Services.Interfaces;

namespace SchoolPaymentSystem.Controllers;

[Authorize]
[Route("api/academic")]
public class AcademicController : BaseController
{
    private readonly IAcademicService    _academic;
    private readonly IFeeSettingService  _feeSetting;
    private readonly ApplicationDbContext _db;

    public AcademicController(
        IAcademicService academic,
        IFeeSettingService feeSetting,
        ApplicationDbContext db)
    {
        _academic   = academic;
        _feeSetting = feeSetting;
        _db         = db;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GRADES
    // ══════════════════════════════════════════════════════════════════════════

    /// <summary>List all grades ordered by level.</summary>
    [HttpGet("grades")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(List<GradeDto>), 200)]
    public async Task<IActionResult> GetGrades()
    {
        var grades = await _academic.GetAllGradesAsync();
        return Ok(grades);
    }

    /// <summary>Create a new grade (e.g. ECD A, Grade 1). Admin only.</summary>
    [HttpPost("grades")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(GradeDto), 201)]
    [ProducesResponseType(400)]
    [ProducesResponseType(409)]
    public async Task<IActionResult> CreateGrade([FromBody] CreateGradeRequest request)
    {
        var grade = await _academic.CreateGradeAsync(request);
        return Created(grade, "Grade created.");
    }

    /// <summary>Update an existing grade's name or active status. Admin only.</summary>
    [HttpPut("grades/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(GradeDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> UpdateGrade(int id, [FromBody] UpdateGradeRequest request)
    {
        var grade = await _academic.UpdateGradeAsync(id, request);
        return Ok(grade, "Grade updated.");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ACADEMIC YEARS
    // ══════════════════════════════════════════════════════════════════════════

    /// <summary>List all academic years newest-first.</summary>
    [HttpGet("years")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(List<AcademicYearDto>), 200)]
    public async Task<IActionResult> GetYears()
    {
        var years = await _academic.GetAllYearsAsync();
        return Ok(years);
    }

    /// <summary>Return the currently active academic year.</summary>
    [HttpGet("years/active")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(AcademicYearDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetActiveYear()
    {
        var year = await _academic.GetActiveYearAsync();
        return Ok(year);
    }

    /// <summary>Create a new academic year. Admin only.</summary>
    [HttpPost("years")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(AcademicYearDto), 201)]
    [ProducesResponseType(409)]
    public async Task<IActionResult> CreateYear([FromBody] CreateAcademicYearRequest request)
    {
        var year = await _academic.CreateAcademicYearAsync(request);
        return Created(year, "Academic year created.");
    }

    /// <summary>
    /// Mark an academic year as active (deactivates all others).
    /// Admin only.
    /// </summary>
    [HttpPut("years/{id:int}/set-active")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> SetActiveYear(int id)
    {
        await _academic.SetActiveYearAsync(id);
        return NoContent("Academic year set as active.");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TERMS
    // ══════════════════════════════════════════════════════════════════════════

    /// <summary>List all terms for a given academic year.</summary>
    [HttpGet("terms")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(List<TermDto>), 200)]
    public async Task<IActionResult> GetTerms([FromQuery] int academicYearId)
    {
        var terms = await _academic.GetTermsByYearAsync(academicYearId);
        return Ok(terms);
    }

    /// <summary>Return the currently active term.</summary>
    [HttpGet("terms/active")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(TermDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetActiveTerm()
    {
        var term = await _academic.GetActiveTermAsync();
        return Ok(term);
    }

    /// <summary>
    /// Create a term with its months. The monthNumbers list defines which
    /// calendar months (1–12) belong to this term and their order.
    /// Admin only.
    /// </summary>
    [HttpPost("terms")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(TermDto), 201)]
    [ProducesResponseType(400)]
    [ProducesResponseType(409)]
    public async Task<IActionResult> CreateTerm([FromBody] CreateTermRequest request)
    {
        var term = await _academic.CreateTermAsync(request);
        return Created(term, "Term created.");
    }

    /// <summary>Update term dates / name / active status. Admin only.</summary>
    [HttpPut("terms/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(TermDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> UpdateTerm(int id, [FromBody] UpdateTermRequest request)
    {
        var term = await _academic.UpdateTermAsync(id, request);
        return Ok(term, "Term updated.");
    }

    /// <summary>
    /// Mark a term as active within its academic year (deactivates sibling terms).
    /// Admin only.
    /// </summary>
    [HttpPut("terms/{id:int}/set-active")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> SetActiveTerm(int id)
    {
        await _academic.SetActiveTermAsync(id);
        return NoContent("Term set as active.");
    }

    /// <summary>
    /// Returns the list of months belonging to a term, ordered by SortOrder.
    /// Used by the client to populate month dropdowns (fee overrides, transport targets).
    /// </summary>
    [HttpGet("terms/{id:int}/months")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetTermMonths(int id)
    {
        var months = await _db.TermMonth.AsNoTracking()
            .Where(m => m.TermId == id)
            .OrderBy(m => m.SortOrder)
            .Select(m => new { m.Id, m.MonthName, m.SortOrder, m.TermId })
            .ToListAsync();
        return Ok(months);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TERM FEES
    // ══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// List all fee configurations for a term (one row per grade).
    /// </summary>
    [HttpGet("terms/{termId:int}/fees")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(List<TermFeeDto>), 200)]
    public async Task<IActionResult> GetTermFees(int termId)
    {
        var fees = await _academic.GetTermFeesAsync(termId);
        return Ok(fees);
    }

    /// <summary>
    /// Create or update the fee for a specific grade in a term.
    /// If a fee already exists for that term+grade combination it is updated.
    /// Admin only.
    /// </summary>
    [HttpPost("fees")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(TermFeeDto), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> SetFee([FromBody] SetTermFeeRequest request)
    {
        var fee = await _academic.SetTermFeeAsync(request);
        return Ok(fee, "Fee configured.");
    }

    /// <summary>
    /// Create or update a per-month tuition override for a specific TermFee (grade+term).
    /// When set, the specified month uses this amount instead of the flat split.
    /// Admin only.
    /// </summary>
    [HttpPost("fees/month")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(TermFeeDto), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> SetMonthFee([FromBody] SetTermMonthFeeRequest request)
    {
        var fee = await _academic.SetTermMonthFeeAsync(request);
        return Ok(fee, "Per-month fee configured.");
    }

    /// <summary>
    /// Remove a per-month tuition override, reverting that month back to the flat split.
    /// Admin only.
    /// </summary>
    [HttpDelete("fees/month")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(TermFeeDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> DeleteMonthFee(
        [FromQuery] int termFeeId,
        [FromQuery] int termMonthId)
    {
        var fee = await _academic.DeleteTermMonthFeeAsync(termFeeId, termMonthId);
        return Ok(fee, "Per-month fee override removed.");
    }

    /// <summary>
    /// Look up the exact fee that applies to a specific student for a term,
    /// resolving through that student's grade assignment for the year.
    /// Used by the payment form to pre-populate the amount due.
    /// </summary>
    [HttpGet("fees/student")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(decimal), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetStudentFee(
        [FromQuery] int studentId,
        [FromQuery] int termId,
        [FromQuery] int academicYearId)
    {
        var amount = await _academic.GetTermFeeForStudentAsync(studentId, termId, academicYearId);
        return Ok(amount);
    }

    /// <summary>
    /// Returns all custom fee components for a specific TermFee (term+grade combo).
    /// This is a convenience proxy — the full CRUD lives at /api/fees/custom/{termFeeId}.
    /// </summary>
    [HttpGet("fees/{termFeeId:int}/custom")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(List<TermCustomFeeDto>), 200)]
    public async Task<IActionResult> GetCustomFees(int termFeeId)
    {
        var fees = await _feeSetting.GetCustomFeesAsync(termFeeId);
        return Ok(fees);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TERM EXTENSION MONTHS
    // ══════════════════════════════════════════════════════════════════════════

    /// <summary>List all extension months for a term.</summary>
    [HttpGet("terms/{termId:int}/extensions")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(List<TermExtensionMonthDto>), 200)]
    public async Task<IActionResult> GetExtensionMonths(int termId)
    {
        var months = await _academic.GetExtensionMonthsAsync(termId);
        return Ok(months);
    }

    /// <summary>Add an extension month to a term. Admin only.</summary>
    [HttpPost("terms/extensions")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(TermExtensionMonthDto), 201)]
    [ProducesResponseType(400)]
    [ProducesResponseType(409)]
    public async Task<IActionResult> AddExtensionMonth([FromBody] AddTermExtensionMonthRequest request)
    {
        var result = await _academic.AddExtensionMonthAsync(request);
        return Created(result, "Extension month added.");
    }

    /// <summary>Remove an extension month (and all its grade fees). Admin only.</summary>
    [HttpDelete("terms/extensions/{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> RemoveExtensionMonth(int id)
    {
        await _academic.RemoveExtensionMonthAsync(id);
        return NoContent("Extension month removed.");
    }

    /// <summary>Toggle active state of an extension month. Admin only.</summary>
    [HttpPut("terms/extensions/{id:int}/toggle")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> ToggleExtensionMonth(int id, [FromQuery] bool isActive)
    {
        await _academic.ToggleExtensionMonthAsync(id, isActive);
        return NoContent("Extension month toggled.");
    }

    /// <summary>
    /// Set (create or update) the fee for one grade on an extension month.
    /// Only grades configured here will see this month in their payment screen.
    /// Admin only.
    /// </summary>
    [HttpPost("terms/extensions/fees")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(TermExtensionMonthDto), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> SetExtensionFee([FromBody] SetExtensionFeeRequest request)
    {
        var result = await _academic.SetExtensionFeeAsync(request);
        return Ok(result, "Extension fee configured.");
    }

    /// <summary>Remove a grade's fee from an extension month. Admin only.</summary>
    [HttpDelete("terms/extensions/{extensionMonthId:int}/fees/{gradeId:int}")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(TermExtensionMonthDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> RemoveExtensionFee(int extensionMonthId, int gradeId)
    {
        var result = await _academic.RemoveExtensionFeeAsync(extensionMonthId, gradeId);
        return Ok(result, "Extension fee removed.");
    }
}