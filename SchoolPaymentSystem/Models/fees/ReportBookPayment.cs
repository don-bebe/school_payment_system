using SchoolPaymentSystem.Models.payment;
using SchoolPaymentSystem.Models.term;
using SchoolPaymentSystem.Models.user;

namespace SchoolPaymentSystem.Models.fees;

/// <summary>
/// Records a report book payment.
/// IsReplacement = false → compulsory purchase for a new enrolment.
/// IsReplacement = true  → student lost their book and is buying a replacement.
/// </summary>
public class ReportBookPayment
{
    public int     Id             { get; set; }
    public int     StudentId      { get; set; }
    public int     AcademicYearId { get; set; }
    public int     PaymentId      { get; set; }
    public decimal AmountPaid     { get; set; }
    public bool    IsReplacement  { get; set; } = false;
    public DateTime PaidAt        { get; set; } = DateTime.UtcNow;

    // ── Navigation ──────────────────────────────────────────────────────────
    public Student      Student      { get; set; } = null!;
    public AcademicYear AcademicYear { get; set; } = null!;
    public Payment      Payment      { get; set; } = null!;
}
