namespace SchoolPaymentSystem.DTO.Payment;

public record SetZigRateRequest(
    decimal RatePerUsd,
    string? Notes
    );