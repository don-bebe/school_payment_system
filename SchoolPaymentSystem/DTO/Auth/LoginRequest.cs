namespace SchoolPaymentSystem.DTO.Auth;

public record LoginRequest(
    string Email,
    string Password
    );