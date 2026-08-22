namespace SchoolPaymentSystem.DTO.Reports;

public record IncomeByMethodDto(
    string  PaymentMethodName,
    string  PaymentMethodCode,
    string  Currency,
    decimal Total,
    int     Count,
    bool    IsPrepayment,
    /// <summary>
    /// For ZiG payments: sum of AmountUsd (converted at time of each payment).
    /// For USD payments: equals Total. For in-kind: 0.
    /// </summary>
    decimal TotalUsd
    );