namespace SchoolPaymentSystem.DTO.Reports;

/// <summary>
/// Total collected for a specific fee type (e.g. Tuition, SportsLevy, RegistrationFee)
/// in a given currency, within the report period.
/// </summary>
public record FeeTypeBreakdownDto(
    string  FeeType,       // PaymentItemType.ToString() — "Tuition", "SportsLevy", etc.
    string  Label,         // human-readable label for the UI
    string  Currency,      // "USD" | "ZIG"
    decimal Total,         // sum of AmountPaid for this fee type + currency
    decimal TotalUsd,      // sum of AmountUsd (always USD equivalent)
    int     Count          // number of breakdown lines
);
