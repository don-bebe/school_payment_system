using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolPaymentSystem.DTO.Fees;
using SchoolPaymentSystem.Services.Interfaces;

namespace SchoolPaymentSystem.Controllers;

/// <summary>
/// All standalone fee configuration endpoints.
/// Every route here is admin-only — reception has no access.
/// </summary>
[Authorize(Policy = "AdminOnly")]
[Route("api/fees")]
public class FeeSettingController : BaseController
{
    private readonly IFeeSettingService _fees;
    private readonly IFeeRuleService    _rules;

    public FeeSettingController(IFeeSettingService fees, IFeeRuleService rules)
    {
        _fees  = fees;
        _rules = rules;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TERM CUSTOM FEES
    // ══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// List all admin-defined custom fee components for a given TermFee (term+grade combo).
    /// </summary>
    [HttpGet("custom/{termFeeId:int}")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(List<TermCustomFeeDto>), 200)]
    public async Task<IActionResult> GetCustomFees(int termFeeId)
    {
        var fees = await _fees.GetCustomFeesAsync(termFeeId);
        return Ok(fees);
    }

    /// <summary>Create a new custom fee component on a TermFee.</summary>
    [HttpPost("custom")]
    [ProducesResponseType(typeof(TermCustomFeeDto), 201)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> CreateCustomFee([FromBody] CreateCustomFeeRequest request)
    {
        var fee = await _fees.CreateCustomFeeAsync(request);
        return Created(fee, "Custom fee created.");
    }

    /// <summary>Update an existing custom fee component.</summary>
    [HttpPut("custom/{id:int}")]
    [ProducesResponseType(typeof(TermCustomFeeDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> UpdateCustomFee(int id, [FromBody] UpdateCustomFeeRequest request)
    {
        var fee = await _fees.UpdateCustomFeeAsync(id, request);
        return Ok(fee, "Custom fee updated.");
    }

    /// <summary>Permanently delete a custom fee component.</summary>
    [HttpDelete("custom/{id:int}")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> DeleteCustomFee(int id)
    {
        await _fees.DeleteCustomFeeAsync(id);
        return NoContent("Custom fee deleted.");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // REGISTRATION FEE
    // ══════════════════════════════════════════════════════════════════════════

    /// <summary>Get the registration fee setting for an academic year.</summary>
    [HttpGet("registration/{academicYearId:int}")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(RegistrationFeeSettingDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetRegistrationFee(int academicYearId)
    {
        var fee = await _fees.GetRegistrationFeeAsync(academicYearId);
        if (fee is null) return NotFound(new { message = "No registration fee configured for this year." });
        return Ok(fee);
    }

    /// <summary>Create or update the registration fee for an academic year.</summary>
    [HttpPost("registration")]
    [ProducesResponseType(typeof(RegistrationFeeSettingDto), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> SetRegistrationFee([FromBody] SetRegistrationFeeRequest request)
    {
        var fee = await _fees.SetRegistrationFeeAsync(request);
        return Ok(fee, "Registration fee saved.");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // REPORT BOOK FEE
    // ══════════════════════════════════════════════════════════════════════════

    /// <summary>Get the report book price for an academic year.</summary>
    [HttpGet("report-book/{academicYearId:int}")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(ReportBookSettingDto), 200)]
    public async Task<IActionResult> GetReportBookFee(int academicYearId)
    {
        var fee = await _fees.GetReportBookFeeAsync(academicYearId);
        if (fee is null) return NotFound(new { message = "No report book fee configured for this year." });
        return Ok(fee);
    }

    /// <summary>Create or update the report book fee for an academic year.</summary>
    [HttpPost("report-book")]
    [ProducesResponseType(typeof(ReportBookSettingDto), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> SetReportBookFee([FromBody] SetReportBookFeeRequest request)
    {
        var fee = await _fees.SetReportBookFeeAsync(request);
        return Ok(fee, "Report book fee saved.");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ADMISSION FEE
    // ══════════════════════════════════════════════════════════════════════════

    /// <summary>Get the admission fee for an academic year.</summary>
    [HttpGet("admission/{academicYearId:int}")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(AdmissionFeeSettingDto), 200)]
    public async Task<IActionResult> GetAdmissionFee(int academicYearId)
    {
        var fee = await _fees.GetAdmissionFeeAsync(academicYearId);
        if (fee is null) return NotFound(new { message = "No admission fee configured for this year." });
        return Ok(fee);
    }

    /// <summary>Create or update the admission fee for an academic year.</summary>
    [HttpPost("admission")]
    [ProducesResponseType(typeof(AdmissionFeeSettingDto), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> SetAdmissionFee([FromBody] SetAdmissionFeeRequest request)
    {
        var fee = await _fees.SetAdmissionFeeAsync(request);
        return Ok(fee, "Admission fee saved.");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TRANSPORT FEE
    // ══════════════════════════════════════════════════════════════════════════

    /// <summary>Get the monthly transport fee for an academic year.</summary>
    [HttpGet("transport/{academicYearId:int}")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(TransportFeeSettingDto), 200)]
    public async Task<IActionResult> GetTransportFee(int academicYearId)
    {
        var fee = await _fees.GetTransportFeeAsync(academicYearId);
        if (fee is null) return NotFound(new { message = "No transport fee configured for this year." });
        return Ok(fee);
    }

    /// <summary>Create or update the transport fee for an academic year.</summary>
    [HttpPost("transport")]
    [ProducesResponseType(typeof(TransportFeeSettingDto), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> SetTransportFee([FromBody] SetTransportFeeRequest request)
    {
        var fee = await _fees.SetTransportFeeAsync(request);
        return Ok(fee, "Transport fee saved.");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PROJECT FEE
    // ══════════════════════════════════════════════════════════════════════════

    /// <summary>Get the project fee for an academic year (Grade 7 only).</summary>
    [HttpGet("project/{academicYearId:int}")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(ProjectFeeSettingDto), 200)]
    public async Task<IActionResult> GetProjectFee(int academicYearId)
    {
        var fee = await _fees.GetProjectFeeAsync(academicYearId);
        if (fee is null) return NotFound(new { message = "No project fee configured for this year." });
        return Ok(fee);
    }

    /// <summary>Create or update the project fee for an academic year.</summary>
    [HttpPost("project")]
    [ProducesResponseType(typeof(ProjectFeeSettingDto), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> SetProjectFee([FromBody] SetProjectFeeRequest request)
    {
        var fee = await _fees.SetProjectFeeAsync(request);
        return Ok(fee, "Project fee saved.");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // UNIFORM ITEMS
    // ══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// List all uniform items. Pass activeOnly=false to include deactivated items.
    /// </summary>
    [HttpGet("uniforms")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(List<UniformItemDto>), 200)]
    public async Task<IActionResult> GetUniforms([FromQuery] bool activeOnly = true)
    {
        var items = await _fees.GetUniformItemsAsync(activeOnly);
        return Ok(items);
    }

    /// <summary>Create a new uniform item.</summary>
    [HttpPost("uniforms")]
    [ProducesResponseType(typeof(UniformItemDto), 201)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> CreateUniform([FromBody] CreateUniformItemRequest request)
    {
        var item = await _fees.CreateUniformItemAsync(request);
        return Created(item, "Uniform item created.");
    }

    /// <summary>Update an existing uniform item (name, gender, price, active status).</summary>
    [HttpPut("uniforms/{id:int}")]
    [ProducesResponseType(typeof(UniformItemDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> UpdateUniform(int id, [FromBody] UpdateUniformItemRequest request)
    {
        var item = await _fees.UpdateUniformItemAsync(id, request);
        return Ok(item, "Uniform item updated.");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TRIPS
    // ══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// List trips for a term. Pass activeOnly=true to show only open trips.
    /// </summary>
    [HttpGet("trips/{termId:int}")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(List<TripSettingDto>), 200)]
    public async Task<IActionResult> GetTrips(int termId, [FromQuery] bool activeOnly = false)
    {
        var trips = await _fees.GetTripsAsync(termId, activeOnly);
        return Ok(trips);
    }

    /// <summary>Create a new trip for a term.</summary>
    [HttpPost("trips")]
    [ProducesResponseType(typeof(TripSettingDto), 201)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> CreateTrip([FromBody] CreateTripRequest request)
    {
        var trip = await _fees.CreateTripAsync(request);
        return Created(trip, "Trip created.");
    }

    /// <summary>Update a trip (name, amount, or close it by setting IsActive = false).</summary>
    [HttpPut("trips/{id:int}")]
    [ProducesResponseType(typeof(TripSettingDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> UpdateTrip(int id, [FromBody] UpdateTripRequest request)
    {
        var trip = await _fees.UpdateTripAsync(id, request);
        return Ok(trip, "Trip updated.");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // EFFECTIVE FEE RESOLUTION
    // ══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Returns the fully resolved fee for a student in a term — after applying
    /// staff-child overrides or the sibling rule. Used by the payment form
    /// to populate the tuition breakdown preview.
    /// </summary>
    [HttpGet("effective")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(EffectiveFeeDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetEffectiveFee(
        [FromQuery] int studentId,
        [FromQuery] int termId,
        [FromQuery] int academicYearId)
    {
        var fee = await _rules.GetEffectiveFeeAsync(studentId, termId, academicYearId);
        return Ok(fee);
    }
}
