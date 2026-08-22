using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolPaymentSystem.DTO.Grade;
using SchoolPaymentSystem.DTO.Student;
using SchoolPaymentSystem.Services.Interfaces;

namespace SchoolPaymentSystem.Controllers;

[Authorize]
public class StudentsController : BaseController
{
    private readonly IStudentService _students;
    private readonly IFeeRuleService _feeRules;

    public StudentsController(IStudentService students, IFeeRuleService feeRules)
    {
        _students = students;
        _feeRules = feeRules;
    }

    // ── GET /api/students ─────────────────────────────────────────────────────
    [HttpGet]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(200)]
    public async Task<IActionResult> Search([FromQuery] StudentSearchRequest request)
    {
        var result = await _students.SearchAsync(request);
        return Ok(result);
    }

    // ── GET /api/students/{id} ────────────────────────────────────────────────
    [HttpGet("{id:int}")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(StudentDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetById(int id)
    {
        var student = await _students.GetByIdAsync(id);
        return Ok(student);
    }

    // ── GET /api/students/by-number/{number} ──────────────────────────────────
    [HttpGet("by-number/{number}")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(StudentDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetByNumber(string number)
    {
        var student = await _students.GetByStudentNumberAsync(number);
        return Ok(student);
    }

    // ── POST /api/students ────────────────────────────────────────────────────
    /// <summary>Enrol a single new student.</summary>
    [HttpPost]
    [Authorize(Policy = "AdminOrReception")]
    [ProducesResponseType(typeof(StudentDto), 201)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Create([FromBody] CreateStudentRequest request)
    {
        var student = await _students.CreateAsync(request);
        return Created(student, "Student enrolled successfully.");
    }

    // ── POST /api/students/bulk-enrol ─────────────────────────────────────────
    /// <summary>
    /// Enrol up to 10 existing students in one transaction.
    /// Rows with duplicate name+DOB are skipped and reported in the response.
    /// Admin only.
    /// </summary>
    [HttpPost("bulk-enrol")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(BulkEnrolResultDto), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> BulkEnrol([FromBody] BulkEnrolRequest request)
    {
        var result = await _students.BulkEnrolAsync(request);
        return Ok(result, $"Enrolled {result.Enrolled} student(s).");
    }

    // ── PUT /api/students/{id} ────────────────────────────────────────────────
    [HttpPut("{id:int}")]
    [Authorize(Policy = "AdminOrReception")]
    [ProducesResponseType(typeof(StudentDto), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateStudentRequest request)
    {
        var student = await _students.UpdateAsync(id, request);
        return Ok(student, "Student updated successfully.");
    }

    // ── PUT /api/students/{id}/deactivate ─────────────────────────────────────
    /// <summary>
    /// Soft-deactivate a student with a documented reason.
    /// Reason must be "Transferred", "Deceased", or "Graduated".
    /// Admin only.
    /// </summary>
    [HttpPut("{id:int}/deactivate")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Deactivate(int id, [FromBody] DeactivateStudentRequest request)
    {
        await _students.DeactivateAsync(id, request);
        return NoContent($"Student deactivated ({request.Reason}).");
    }

    // ── GET /api/students/grade-view ──────────────────────────────────────────
    [HttpGet("grade-view")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(List<StudentGradeViewRow>), 200)]
    public async Task<IActionResult> GradeView(
        [FromQuery] int gradeId,
        [FromQuery] int termId,
        [FromQuery] int academicYearId)
    {
        var rows = await _students.GetGradeViewAsync(gradeId, termId, academicYearId);
        return Ok(rows);
    }

    // ── GET /api/students/group/{groupId} ─────────────────────────────────────
    /// <summary>
    /// Returns all active students in a sibling/guardian group.
    /// Used to display sibling panel on the student profile page.
    /// </summary>
    [HttpGet("group/{groupId:int}")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(List<SiblingDto>), 200)]
    public async Task<IActionResult> GetGroup(
        int groupId, [FromQuery] int academicYearId)
    {
        var result = await _feeRules.GetSiblingGroupAsync(groupId, academicYearId);
        return Ok(result);
    }

    // ── GET /api/students/by-phone ────────────────────────────────────────────
    /// <summary>
    /// Finds active students whose guardian phone matches the given number.
    /// Used to auto-suggest a group ID when enrolling a new sibling.
    /// </summary>
    [HttpGet("by-phone")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(List<SiblingDto>), 200)]
    public async Task<IActionResult> FindByPhone(
        [FromQuery] string phone, [FromQuery] int academicYearId)
    {
        if (string.IsNullOrWhiteSpace(phone) || phone.Replace(" ", "").Length < 7)
            return Ok(new List<SiblingDto>());
        var result = await _feeRules.FindByGuardianPhoneAsync(phone, academicYearId);
        return Ok(result);
    }

    // ── POST /api/students/promote ────────────────────────────────────────────
    [HttpPost("promote")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(200)]
    public async Task<IActionResult> Promote([FromBody] PromoteRequest request)
    {
        await _students.PromoteStudentsAsync(request.FromAcademicYearId, request.ToAcademicYearId);
        return NoContent("Students promoted successfully.");
    }

    // ── POST /api/students/assign-sibling-group ──────────────────────────────
    [HttpPost("assign-sibling-group")]
    [Authorize(Policy = "AdminOrReception")]
    [ProducesResponseType(typeof(int), 200)]
    public async Task<IActionResult> AssignSiblingGroup([FromBody] List<int> studentIds)
    {
        var groupId = await _students.AssignSiblingGroupAsync(studentIds);
        return Ok(new { groupId });
    }

    // ── GET /api/students/graduated ───────────────────────────────────────────
    /// <summary>
    /// Returns all graduated students with their outstanding balance across all years.
    /// Used by the Alumni page so admins can review and clear arrears.
    /// </summary>
    [HttpGet("graduated")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(200)]
    public async Task<IActionResult> GetGraduated()
    {
        var result = await _students.GetGraduatedWithBalanceAsync();
        return Ok(result);
    }

    // ── POST /api/students/{id}/clear-arrears ─────────────────────────────────
    /// <summary>
    /// Writes off any outstanding tuition arrears for a graduated/inactive student.
    /// Creates a WrittenOff payment record so the balance clears without affecting
    /// income totals or active student counts.
    /// Admin only.
    /// </summary>
    [HttpPost("{id:int}/clear-arrears")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> ClearArrears(int id, [FromBody] ClearArrearsRequest request)
    {
        await _students.ClearArrearsAsync(id, request);
        return NoContent("Arrears cleared successfully.");
    }
}
