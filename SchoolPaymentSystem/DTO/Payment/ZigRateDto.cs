namespace SchoolPaymentSystem.DTO.Payment;

public record ZigRateDto(
    int      Id,
    decimal  RatePerUsd,
    DateTime EffectiveFrom,
    DateTime? EffectiveTo,
    bool     IsCurrent,
    DateTime SetAt,
    string   SetByName,
    string?  Notes
    );