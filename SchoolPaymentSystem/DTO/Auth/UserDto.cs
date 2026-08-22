namespace SchoolPaymentSystem.DTO.Auth;

public record UserDto(
    string    Id,
    string    FirstName,
    string    LastName,
    string    Email,
    string    Role,
    bool      IsActive,
    DateTime? LastLogin,
    string?   SignatureImageBase64);  // null = no signature uploaded yet