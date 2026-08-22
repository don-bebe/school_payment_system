using System.Globalization;

namespace SchoolPaymentSystem.Helpers;

public static class DateHelper
{
    /// <summary>Returns the current academic term based on today's date and active terms.</summary>
    public static string MonthName(int monthNumber) =>
        CultureInfo.CurrentCulture.DateTimeFormat.GetMonthName(monthNumber);

    /// <summary>Returns all month numbers in a given date range (inclusive).</summary>
    public static IEnumerable<int> MonthsBetween(DateTime start, DateTime end)
    {
        var current = new DateTime(start.Year, start.Month, 1);
        while (current <= end)
        {
            yield return current.Month;
            current = current.AddMonths(1);
        }
    }

    public static bool IsCurrentTerm(DateTime start, DateTime end) =>
        DateTime.Now >= start && DateTime.Now <= end;
}