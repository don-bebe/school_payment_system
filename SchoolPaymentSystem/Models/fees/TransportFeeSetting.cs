using SchoolPaymentSystem.Models.term;

namespace SchoolPaymentSystem.Models.fees;

/// <summary>
/// Admin-configured monthly transport fee for an academic year.
/// Opt-in only — not all students pay this.
/// Payment is captured per term month, not as a term total.
/// </summary>
public class TransportFeeSetting
{
    public int     Id             { get; set; }
    public int     AcademicYearId { get; set; }
    public decimal MonthlyAmount  { get; set; }

    // ── Navigation ──────────────────────────────────────────────────────────
    public AcademicYear AcademicYear { get; set; } = null!;
}
