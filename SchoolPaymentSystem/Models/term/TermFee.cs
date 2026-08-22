using SchoolPaymentSystem.Models.fees;
using SchoolPaymentSystem.Models.grade;

namespace SchoolPaymentSystem.Models.term;

public class TermFee
{
    public int     Id      { get; set; }
    public int     TermId  { get; set; }
    public int     GradeId { get; set; }

    /// <summary>Total tuition for the full term. Split evenly across term months by the payment engine.</summary>
    public decimal TuitionAmount { get; set; }

    /// <summary>Sports levy charged once in the first month of the term.</summary>
    public decimal SportsLevyAmount { get; set; }

    /// <summary>
    /// Override tuition amount for staff children and siblings-of-three.
    /// Null means no override — standard TuitionAmount applies.
    /// </summary>
    public decimal? StaffChildTuitionAmount { get; set; }

    /// <summary>
    /// Override sports levy for staff children and siblings-of-three.
    /// Null means no override — standard SportsLevyAmount applies.
    /// </summary>
    public decimal? StaffChildSportsLevyAmount { get; set; }

    // ── Navigation ──────────────────────────────────────────────────────────
    public Term  Term  { get; set; } = null!;
    public Grade Grade { get; set; } = null!;

    /// <summary>Admin-defined extra fee components specific to this term and grade.</summary>
    public ICollection<TermCustomFee> CustomFees { get; set; } = [];

    /// <summary>Optional per-month tuition amount overrides for this term+grade combo.</summary>
    public ICollection<TermMonthFee> MonthFees { get; set; } = [];
}