namespace SchoolPaymentSystem.DTO.Payment;

public record CreatePaymentMethodRequest(
    string Name,
    string Code,
    bool   RequiresReference
    );