namespace SchoolPaymentSystem.DTO.Notifications;

public record MethodTodayDto(
    string  MethodName,
    string  Code,
    string  Currency,
    decimal Total,
    int     Count,
    bool    IsPrepayment
    );