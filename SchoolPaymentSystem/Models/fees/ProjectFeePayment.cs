using SchoolPaymentSystem.Models.payment;
using SchoolPaymentSystem.Models.term;
using SchoolPaymentSystem.Models.user;

namespace SchoolPaymentSystem.Models.fees;

/// <summary>
/// Records a project fee payment for a Grade 6 or Grade 7 student.
/// Multiple records may exist per student — one per payment transaction —
/// because students may pay in instalments across Grade 6 and Grade 7.
/// Sum AmountPaid across all records to get the student's total paid.
/// </summary>
public class ProjectFeePayment
{
    public int     Id             { get; set; }
    public int     StudentId      { get; set; }
    public int     AcademicYearId { get; set; }
    public int     PaymentId      { get; set; }
    public decimal AmountPaid     { get; set; }
    public DateTime PaidAt        { get; set; } = DateTime.UtcNow;

    // ── Navigation ──────────────────────────────────────────────────────────
    public Student      Student      { get; set; } = null!;
    public AcademicYear AcademicYear { get; set; } = null!;
    public Payment      Payment      { get; set; } = null!;
}
