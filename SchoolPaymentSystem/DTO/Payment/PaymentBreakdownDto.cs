namespace SchoolPaymentSystem.DTO.Payment;

public record PaymentBreakdownDto(
    int     Id,
    string  Label,       // Month name for tuition; fee name for standalone fees
    decimal AmountDue,
    decimal AmountPaid,
    decimal Balance,
    string  Status       // "Paid" | "Partial" | "Unpaid" | "NotApplicable"
);