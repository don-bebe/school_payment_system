namespace SchoolPaymentSystem.DTO.Payment;

public record ReversePaymentRequest(
    int    PaymentId,
    string Reason
    );