namespace SchoolPaymentSystem.DTO.Auth;

public record ResetPasswordRequest(
    string UserId,
    string Token,
    string NewPassword
    );