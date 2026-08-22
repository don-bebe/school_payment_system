using SchoolPaymentSystem.Models.fees;
using SchoolPaymentSystem.Models.term;
using SchoolPaymentSystem.Models.user;

namespace SchoolPaymentSystem.Models.payment;

public class Payment
{
    public int     Id             { get; set; }
    public int     StudentId      { get; set; }
    public int     TermId         { get; set; }
    public int     AcademicYearId { get; set; }
    public int     PaymentMethodId { get; set; }

    // ── Amounts ──────────────────────────────────────────────────────────────
    public decimal AmountPaid    { get; set; }
    public string  Currency      { get; set; } = "USD";  // USD | ZIG

    /// <summary>
    /// Always stored in USD for accounting consistency.
    /// For USD payments equals AmountPaid; for ZiG payments = AmountPaid / ZigRateUsed.
    /// </summary>
    public decimal AmountUsd     { get; set; }

    /// <summary>The ZiG/USD rate applied at time of payment (null for USD payments).</summary>
    public decimal? ZigRateUsed  { get; set; }

    // ── Mobile-money / EFT reference ─────────────────────────────────────────
    public string? Reference     { get; set; }

    // ── Prepayment / In-kind ─────────────────────────────────────────────────
    public string? PrepaymentDescription { get; set; }

    // ── Audit ────────────────────────────────────────────────────────────────
    public DateTime PaymentDate  { get; set; } = DateTime.Now;
    public string   RecordedById { get; set; } = string.Empty;   // ApplicationUser.Id
    public string?  Notes        { get; set; }

    public PaymentStatus Status  { get; set; } = PaymentStatus.Completed;

    // ── Navigation ──────────────────────────────────────────────────────────
    public Student                       Student         { get; set; } = null!;
    public Term                          Term            { get; set; } = null!;
    public AcademicYear                  AcademicYear    { get; set; } = null!;
    public PaymentMethod                 PaymentMethod   { get; set; } = null!;
    public ApplicationUser?              RecordedBy      { get; set; } = null!;
    public Receipt?                      Receipt         { get; set; }
    public ICollection<PaymentBreakdown> Breakdowns      { get; set; } = [];

    // Standalone fee payment records that belong to this transaction
    public ICollection<RegistrationFeePayment> RegistrationFeePayments { get; set; } = [];
    public ICollection<ReportBookPayment>      ReportBookPayments      { get; set; } = [];
    public ICollection<AdmissionFeePayment>    AdmissionFeePayments    { get; set; } = [];
    public ICollection<TransportFeePayment>    TransportFeePayments    { get; set; } = [];
    public ICollection<TripPaymentRecord>      TripPaymentRecords      { get; set; } = [];
    public ICollection<ProjectFeePayment>      ProjectFeePayments      { get; set; } = [];
    public ICollection<UniformPurchaseLine>    UniformPurchaseLines    { get; set; } = [];
}