namespace SchoolPaymentSystem.Models.payment;

public enum MonthPaymentStatus
{
    Paid,
    Partial,
    Unpaid,
    NotApplicable   // month is before the student's enrollment date — no fee obligation
}