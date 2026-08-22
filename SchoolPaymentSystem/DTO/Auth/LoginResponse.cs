namespace SchoolPaymentSystem.DTO.Auth;

public record LoginResponse(
    string Token,
    DateTime Expires,
    UserDto User);