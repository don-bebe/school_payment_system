using SchoolPaymentSystem.Models.payment;
using SchoolPaymentSystem.Models.term;
using SchoolPaymentSystem.Models.user;

namespace SchoolPaymentSystem.Models.fees;

/// <summary>
/// Records a registration fee payment made by a student.
/// Used to enforce the "paid once for Grade 6, twice for Grade 7" business rule.
/// </summary>
public class RegistrationFeePayment
{
    public int     Id             { get; set; }
    public int     StudentId      { get; set; }
    public int     AcademicYearId { get; set; }
    public int     TermId         { get; set; }   // which term this payment covers
    public int     PaymentId      { get; set; }   // FK → Payment (the parent transaction)
    public decimal AmountPaid     { get; set; }
    public DateTime PaidAt        { get; set; } = DateTime.UtcNow;

    // ── Navigation ──────────────────────────────────────────────────────────
    public Student      Student      { get; set; } = null!;
    public AcademicYear AcademicYear { get; set; } = null!;
    public Term         Term         { get; set; } = null!;
    public Payment      Payment      { get; set; } = null!;
}
