namespace SchoolPaymentSystem.DTO.Payment;

public record UpdatePaymentMethodRequest(
    string Name,
    bool   RequiresReference,
    bool   IsActive
    );