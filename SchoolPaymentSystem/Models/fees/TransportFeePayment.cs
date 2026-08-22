using SchoolPaymentSystem.Models.payment;
using SchoolPaymentSystem.Models.term;
using SchoolPaymentSystem.Models.user;

namespace SchoolPaymentSystem.Models.fees;

/// <summary>
/// Records a transport fee payment for a specific term month.
/// Multiple records may exist per student per month (partial payments allowed).
/// The system tracks the total paid vs the full monthly fee to determine
/// how many school days the student can ride.
/// </summary>
public class TransportFeePayment
{
    public int     Id          { get; set; }
    public int     StudentId   { get; set; }
    public int     TermMonthId { get; set; }   // which month this covers
    public int     PaymentId   { get; set; }
    public decimal AmountPaid  { get; set; }
    public DateTime PaidAt     { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Total school days in this month (set when payment is recorded).
    /// Used together with AmountPaid and the configured MonthlyAmount to
    /// calculate how many days the student can ride.
    /// </summary>
    public int?    TotalSchoolDays { get; set; }

    /// <summary>
    /// Number of school-days this payment entitles the student to.
    /// Calculated as: floor((AmountPaid / MonthlyAmount) * TotalSchoolDays).
    /// Null = full month (AmountPaid >= MonthlyAmount).
    /// </summary>
    public int?    DaysEntitled  { get; set; }

    /// <summary>
    /// Optional: if the student only needs transport for part of the month
    /// (e.g. started mid-month), record the effective start date.
    /// </summary>
    public DateTime? TransportStartDate { get; set; }

    /// <summary>
    /// Optional free-text note (e.g. "Paid mid-month — entitled to 10 days from 15 Apr").
    /// </summary>
    public string? Notes { get; set; }

    // ── Navigation ──────────────────────────────────────────────────────────
    public Student   Student   { get; set; } = null!;
    public TermMonth TermMonth { get; set; } = null!;
    public Payment   Payment   { get; set; } = null!;
}
