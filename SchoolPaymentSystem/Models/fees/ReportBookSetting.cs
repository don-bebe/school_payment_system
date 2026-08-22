using SchoolPaymentSystem.Models.term;

namespace SchoolPaymentSystem.Models.fees;

/// <summary>
/// Admin-configured report book price for an academic year.
/// Compulsory for newly enrolled students.
/// Can also be purchased again if a student loses their report book
/// (admin must flag the student's payment record as a replacement).
/// </summary>
public class ReportBookSetting
{
    public int     Id             { get; set; }
    public int     AcademicYearId { get; set; }
    public decimal Amount         { get; set; }

    // ── Navigation ──────────────────────────────────────────────────────────
    public AcademicYear AcademicYear { get; set; } = null!;
}
