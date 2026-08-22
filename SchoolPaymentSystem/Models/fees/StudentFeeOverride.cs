using SchoolPaymentSystem.Models.term;
using SchoolPaymentSystem.Models.user;

namespace SchoolPaymentSystem.Models.fees;

/// <summary>
/// Allows administrators to give a student a custom fee rate that overrides
/// the standard term fee. Supports:
///   - Permanent custom rates (e.g. a student pays $25 or $30 instead of full)
///   - Single-month sports/achievement discounts (e.g. sports star discount for April only)
///   - Explicit sibling discount override (parent can choose WHICH child gets it)
/// </summary>
public class StudentFeeOverride
{
    public int     Id             { get; set; }
    public int     StudentId      { get; set; }
    public int     AcademicYearId { get; set; }

    /// <summary>
    /// The term month this override applies to.
    /// Null = applies for the whole term (permanent flat rate).
    /// Set = applies only for this specific month (e.g. sports discount).
    /// </summary>
    public int?    TermMonthId    { get; set; }

    /// <summary>
    /// Fixed tuition amount the student pays. When set, the standard TermFee
    /// tuition rate is ignored for this student in this period.
    /// Null = use the standard rate (no tuition override).
    /// </summary>
    public decimal? OverrideTuitionAmount { get; set; }

    /// <summary>
    /// Whether this student should receive the sibling/staff-child discount rate,
    /// regardless of their grade level. Allows a parent to designate a lower-grade
    /// child as the one receiving the discount.
    /// </summary>
    public bool    ForceStaffChildRate { get; set; } = false;

    /// <summary>Human-readable reason recorded for audit purposes.</summary>
    public string  Reason         { get; set; } = string.Empty;

    public bool    IsActive       { get; set; } = true;
    public DateTime CreatedAt     { get; set; } = DateTime.UtcNow;
    public string  CreatedById    { get; set; } = string.Empty;

    // ── Navigation ──────────────────────────────────────────────────────────
    public Student      Student      { get; set; } = null!;
    public AcademicYear AcademicYear { get; set; } = null!;
    public TermMonth?   TermMonth    { get; set; }
}
