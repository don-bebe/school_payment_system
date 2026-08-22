namespace SchoolPaymentSystem.DTO.Auth;

/// <summary>
/// Saves a user's signature image as a Base64 data URI.
/// The client sends the full data URI (e.g. "data:image/png;base64,...").
/// Pass null to clear the signature.
/// </summary>
public record SaveSignatureRequest(string? SignatureImageBase64);
