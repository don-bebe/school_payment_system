using SchoolPaymentSystem.Models.term;

namespace SchoolPaymentSystem.Models.fees;

/// <summary>
/// Admin-configured project fee for Grade 6 and Grade 7 students.
/// It is a once-per-student fee — students may start paying it in Grade 6
/// and finish in Grade 7. The total amount due is this setting's Amount;
/// partial payments are tracked across academic years by summing all
/// ProjectFeePayment records for the student.
/// </summary>
public class ProjectFeeSetting
{
    public int     Id             { get; set; }
    public int     AcademicYearId { get; set; }
    public decimal Amount         { get; set; }

    // ── Navigation ──────────────────────────────────────────────────────────
    public AcademicYear AcademicYear { get; set; } = null!;
}
