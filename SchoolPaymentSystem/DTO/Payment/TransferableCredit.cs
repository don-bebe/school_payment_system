using SchoolPaymentSystem.Models.payment;

namespace SchoolPaymentSystem.DTO.Payment;

/// <summary>
/// Represents a paid credit that is eligible to be transferred to another service.
/// </summary>
public record TransferableCredit(
    int             PaymentId,
    string          ReceiptNumber,
    PaymentItemType ItemType,
    string          Label,               // human-friendly label e.g. "Transport — May"
    decimal         AmountPaid,          // total originally paid
    decimal         AmountAvailable,     // how much has not yet been transferred away
    int?            ReferenceId,         // Trip/CustomFee id
    int?            TermMonthId          // Transport month id
);
