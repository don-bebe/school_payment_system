using SchoolPaymentSystem.Models.term;

namespace SchoolPaymentSystem.Models.fees;

/// <summary>
/// Admin-configured registration fee amount for an academic year.
/// Grade 6: charged once per academic year.
/// Grade 7: charged in Term 1 and Term 2 only.
/// Not applicable to any other grades.
/// </summary>
public class RegistrationFeeSetting
{
    public int     Id             { get; set; }
    public int     AcademicYearId { get; set; }
    public decimal Amount         { get; set; }

    // ── Navigation ──────────────────────────────────────────────────────────
    public AcademicYear AcademicYear { get; set; } = null!;
}
