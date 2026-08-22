using SchoolPaymentSystem.Models.payment;

namespace SchoolPaymentSystem.DTO.Payment;

public record CreatePaymentRequest(
    int     StudentId,
    int     TermId,
    int     AcademicYearId,
    int     PaymentMethodId,
    decimal AmountPaid,
    string  Currency,
    string? Reference,
    string? PrepaymentDescription,
    string? Notes,
    List<SelectedFeeItem>?     SelectedItems,
    List<UniformSelection>?    UniformSelections,
    /// <summary>
    /// Optional surplus transfer instructions supplied by the user when
    /// the amount paid exceeds the total of all selected items.
    /// Processed in order after allocation. Any undirected surplus credits tuition.
    /// </summary>
    List<SurplusTransferRequest>? SurplusTransfers
);

public record SelectedFeeItem(
    PaymentItemType ItemType,
    int?    ReferenceId,
    int?    TermMonthId,
    /// <summary>
    /// Optional: if the user wants to pay a specific amount for this item
    /// (less than the full configured amount), supply it here.
    /// When null the orchestrator allocates up to the full configured amount.
    /// </summary>
    decimal? OverrideAmount = null,
    /// <summary>
    /// For Transport: total school days in this month (used to calculate days entitled
    /// when the student pays partially). Defaults to 20 if not supplied.
    /// </summary>
    int? TotalSchoolDays = null,
    /// <summary>
    /// For Transport: optional date the student starts riding (mid-month starts).
    /// Stored on the TransportFeePayment record for reporting.
    /// </summary>
    DateTime? TransportStartDate = null
);

public record UniformSelection(int UniformItemId, int Quantity);

/// <summary>
/// Directs a specific dollar amount of surplus to a target fee type.
/// One record per target. The orchestrator processes these in order.
/// </summary>
public record SurplusTransferRequest(
    PaymentItemType TargetItemType,
    decimal         Amount,
    int?            TargetReferenceId,   // for Trip / CustomFee targets
    int?            TargetTermMonthId,   // for Transport targets
    string?         Reason
);

/// <summary>
/// Request to manually record a payment against a student's previous-term arrears.
/// The payment is linked to the current active term but itemType = Arrears so
/// it can be distinguished from regular tuition payments.
/// </summary>
public record PayArrearsRequest(
    int     StudentId,
    int     CurrentTermId,       // the term the payment is being recorded under
    int     AcademicYearId,
    int     PaymentMethodId,
    decimal AmountPaid,
    string  Currency,
    string? Reference,
    string? Notes
);
