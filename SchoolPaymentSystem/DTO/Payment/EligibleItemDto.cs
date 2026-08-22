using SchoolPaymentSystem.Models.payment;

namespace SchoolPaymentSystem.DTO.Payment;

/// <summary>
/// Describes a single fee item that is eligible for payment for a specific student.
/// The payment UI renders one checkbox card per item.
/// </summary>
public record EligibleItemDto(
    /// <summary>The fee type this item represents.</summary>
    PaymentItemType ItemType,

    /// <summary>Human-readable name shown on the checkbox card.</summary>
    string Label,

    /// <summary>The amount due for this item.</summary>
    decimal Amount,

    /// <summary>
    /// For Trip items: the TripSetting.Id — sent back in SelectedFeeItem.ReferenceId.
    /// For CustomFee items: the TermCustomFee.Id.
    /// Null for all other types.
    /// </summary>
    int? ReferenceId,

    /// <summary>
    /// For Transport items: the TermMonth.Id this fee covers.
    /// Null for non-monthly items.
    /// </summary>
    int? TermMonthId,

    /// <summary>
    /// Whether this item is compulsory for this student.
    /// Compulsory items are pre-checked in the UI and cannot be deselected
    /// until all compulsory items are covered.
    /// </summary>
    bool IsCompulsory,

    /// <summary>
    /// Whether this item has already been paid for this period.
    /// Used to grey-out items in the UI that are already fully settled.
    /// </summary>
    bool AlreadyPaid
);

/// <summary>
/// Full eligible-items response — includes the items list and any arrears information.
/// </summary>
public record EligibleItemsResponse(
    int    StudentId,
    string StudentName,
    string GradeName,

    /// <summary>All items this student can pay right now.</summary>
    List<EligibleItemDto> Items,

    /// <summary>
    /// Total tuition arrears carried forward from previous terms.
    /// Zero when the student is fully up to date.
    /// </summary>
    decimal TuitionArrearsOwing,

    /// <summary>
    /// Uniform items available for this student's gender.
    /// Populated regardless of selection — the UI shows them when Uniform is ticked.
    /// </summary>
    List<UniformItemEligibleDto> UniformItems
);

/// <summary>Uniform item shown in the sub-panel when Uniform is selected.</summary>
public record UniformItemEligibleDto(
    int     UniformItemId,
    string  Name,
    decimal Price
);
