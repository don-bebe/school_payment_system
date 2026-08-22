namespace SchoolPaymentSystem.DTO.Admin;

public record SystemSettingDto(
    int      Id,
    string   Key,
    string   Value,
    string?  Description,
    string   DataType,
    DateTime UpdatedAt,
    string   UpdatedByName
    );