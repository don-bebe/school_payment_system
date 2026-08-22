namespace SchoolPaymentSystem.DTO.Payment;

public record PaymentMethodDto(
    int    Id,
    string Name,
    string Code,
    bool   RequiresReference,
    bool   IsActive
    );