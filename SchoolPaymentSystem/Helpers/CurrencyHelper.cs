namespace SchoolPaymentSystem.Helpers;

public static class CurrencyHelper
{
    public static string Format(decimal amount, string currency = "USD") =>
        currency.ToUpperInvariant() switch
        {
            "ZIG" => $"ZiG {amount:N2}",
            "USD" => $"${amount:N2}",
            _     => $"{currency} {amount:N2}"
        };

    public static bool IsValid(string currency) =>
        currency?.ToUpperInvariant() is "USD" or "ZIG";
}