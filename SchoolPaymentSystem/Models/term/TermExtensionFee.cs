using SchoolPaymentSystem.Models.grade;

namespace SchoolPaymentSystem.Models.term;

/// <summary>
/// The fee amount a specific grade owes for a TermExtensionMonth.
/// Only grades that have a record here are shown the extension month fee.
/// </summary>
public class TermExtensionFee
{
    public int     Id                   { get; set; }
    public int     TermExtensionMonthId { get; set; }
    public int     GradeId              { get; set; }
    public decimal Amount               { get; set; }

    // ── Navigation ──────────────────────────────────────────────────────────
    public TermExtensionMonth TermExtensionMonth { get; set; } = null!;
    public Grade              Grade              { get; set; } = null!;
}
