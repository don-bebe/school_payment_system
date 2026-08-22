namespace SchoolPaymentSystem.DTO.Payment;

public record ZigConversionDto(
    decimal AmountZig,
    decimal RatePerUsd,
    decimal AmountUsd
    );