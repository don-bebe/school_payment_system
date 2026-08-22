namespace SchoolPaymentSystem.Models.payment;

/// <summary>
/// Identifies what a PaymentBreakdown line item was paying for.
/// Every breakdown row carries one of these so reports and receipts
/// can group and label lines correctly.
/// </summary>
public enum PaymentItemType
{
    Tuition,
    SportsLevy,
    CustomFee,          // admin-defined TermCustomFee
    RegistrationFee,
    ReportBook,
    AdmissionFee,
    Uniform,
    Transport,
    Trip,
    ProjectFee,
    Arrears,        // cross-term arrear payment recorded manually
    ExtensionFee    // fee for an admin-added extension month on a term
}
