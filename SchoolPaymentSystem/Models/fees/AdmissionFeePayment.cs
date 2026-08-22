using SchoolPaymentSystem.Models.payment;
using SchoolPaymentSystem.Models.term;
using SchoolPaymentSystem.Models.user;

namespace SchoolPaymentSystem.Models.fees;

/// <summary>
/// Records the one-time admission fee payment for a newly enrolled student.
/// Only one record per student per academic year is expected.
/// </summary>
public class AdmissionFeePayment
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
