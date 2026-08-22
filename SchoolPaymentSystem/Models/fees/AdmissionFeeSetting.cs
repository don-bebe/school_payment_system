using SchoolPaymentSystem.Models.term;

namespace SchoolPaymentSystem.Models.fees;

/// <summary>
/// Admin-configured admission fee for an academic year.
/// Charged once to any student whose enrolment date falls within the active term.
/// </summary>
public class AdmissionFeeSetting
{
    public int     Id             { get; set; }
    public int     AcademicYearId { get; set; }
    public decimal Amount         { get; set; }

    // ── Navigation ──────────────────────────────────────────────────────────
    public AcademicYear AcademicYear { get; set; } = null!;
}
