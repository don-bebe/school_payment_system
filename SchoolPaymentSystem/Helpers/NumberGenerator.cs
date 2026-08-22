namespace SchoolPaymentSystem.Helpers;

public static class NumberGenerator
{
    // ── Student Number  SCH-2026-00001 ───────────────────────────────────────

    /// <param name="year">Academic year (e.g. 2026).</param>
    /// <param name="sequence">Next sequential number for that year.</param>
    /// <param name="prefix">Configurable prefix (default "SCH").</param>
    public static string StudentNumber(int year, int sequence, string prefix = "SCH") =>
        $"{prefix}-{year}-{sequence:D5}";

    // ── Receipt Number  RCP-2026-00001 ───────────────────────────────────────

    /// <param name="year">Calendar year of payment.</param>
    /// <param name="sequence">Next sequential receipt number for that year.</param>
    /// <param name="prefix">Configurable prefix (default "RCP").</param>
    public static string ReceiptNumber(int year, int sequence, string prefix = "RCP") =>
        $"{prefix}-{year}-{sequence:D5}";

    // ── Helpers ──────────────────────────────────────────────────────────────

    /// <summary>Extracts the year segment from a generated number string.</summary>
    public static int? ParseYear(string number)
    {
        var parts = number?.Split('-');
        if (parts?.Length >= 2 && int.TryParse(parts[1], out var year))
            return year;
        return null;
    }
}