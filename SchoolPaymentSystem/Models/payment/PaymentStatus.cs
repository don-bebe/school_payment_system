namespace SchoolPaymentSystem.Models.payment;

public enum PaymentStatus
{
    Completed,
    Reversed,
    Pending,
    /// <summary>
    /// Arrear written off by an administrator (e.g. for graduated students).
    /// Treated as settled for balance calculations but never appears in income totals.
    /// </summary>
    WrittenOff
}