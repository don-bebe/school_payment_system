namespace SchoolPaymentSystem.DTO.Admin;

public record UpdateSystemSettingRequest(
    string Key,
    string Value
    );