using SchoolPaymentSystem.DTO.Splitter;
using SchoolPaymentSystem.Models.payment;
using SchoolPaymentSystem.Models.term;

namespace SchoolPaymentSystem.Helpers;

public static class PaymentSplitter
{
    // ─────────────────────────────────────────────────────────────────────────
    // Core Split overload — accepts an explicit per-month due map so that
    // fee overrides (custom rates, sports-achievement discounts) are respected.
    // When monthDues is null the method falls back to the flat termFee/n split.
    // ─────────────────────────────────────────────────────────────────────────

    /// <param name="termMonths">Months in sort order.</param>
    /// <param name="termFee">Total term fee (used ONLY as fallback if monthDues is null).</param>
    /// <param name="amountPaid">Amount the parent is paying now.</param>
    /// <param name="existingBreakdowns">Previously recorded amounts per month.</param>
    /// <param name="startingTermMonthId">Months before this are N/A (student not yet enrolled).</param>
    /// <param name="monthDues">
    ///   Optional explicit due amount per TermMonthId. When supplied, the per-month
    ///   due is taken from this map (supporting fee overrides). Months missing from
    ///   the map fall back to the flat rate.
    /// </param>
    public static List<BreakdownAllocation> Split(
        IReadOnlyList<TermMonth> termMonths,
        decimal                  termFee,
        decimal                  amountPaid,
        IReadOnlyList<ExistingAllocation>? existingBreakdowns = null,
        int?   startingTermMonthId = null,
        IReadOnlyDictionary<int, decimal>? monthDues = null)
    {
        if (termMonths.Count == 0)
            throw new ArgumentException("Term must have at least one month.", nameof(termMonths));
        if (amountPaid < 0)
            throw new ArgumentException("Amount paid cannot be negative.", nameof(amountPaid));

        // Fallback flat-rate when no per-month override map supplied
        int     monthCount    = termMonths.Count;
        decimal flatMonthly   = monthCount > 0 ? Math.Round(termFee / monthCount, 2) : 0m;
        decimal flatLastMonth = monthCount > 0 ? termFee - flatMonthly * (monthCount - 1) : 0m;

        var existing = existingBreakdowns?
            .GroupBy(e => e.TermMonthId)
            .ToDictionary(g => g.Key, g => g.Sum(e => e.AmountAlreadyPaid))
            ?? new Dictionary<int, decimal>();

        var result    = new List<BreakdownAllocation>();
        decimal remaining = amountPaid;

        bool reachedEnrollment = !startingTermMonthId.HasValue;

        for (int i = 0; i < termMonths.Count; i++)
        {
            var month = termMonths[i];

            // ── Months before enrollment ──────────────────────────────────────
            if (!reachedEnrollment)
            {
                if (month.Id == startingTermMonthId!.Value)
                    reachedEnrollment = true;
                else
                {
                    result.Add(new BreakdownAllocation(
                        TermMonthId: month.Id,
                        MonthName:   month.MonthName,
                        AmountDue:   0m,
                        AmountPaid:  0m,
                        TotalPaid:   0m,
                        Balance:     0m,
                        Status:      MonthPaymentStatus.NotApplicable));
                    continue;
                }
            }

            // ── Resolve this month's due ──────────────────────────────────────
            decimal due;
            if (monthDues is not null && monthDues.TryGetValue(month.Id, out var overrideDue))
                due = overrideDue;
            else
                due = i == monthCount - 1 ? flatLastMonth : flatMonthly;

            decimal alreadyPaid = existing.GetValueOrDefault(month.Id, 0m);
            decimal outstanding = Math.Max(0m, due - alreadyPaid);

            decimal nowPaying    = Math.Min(remaining, outstanding);
            remaining            = Math.Max(0m, remaining - nowPaying);

            decimal totalPaidAfter = alreadyPaid + nowPaying;

            var status = totalPaidAfter >= due - 0.001m
                ? MonthPaymentStatus.Paid
                : totalPaidAfter > 0
                    ? MonthPaymentStatus.Partial
                    : MonthPaymentStatus.Unpaid;

            result.Add(new BreakdownAllocation(
                TermMonthId: month.Id,
                MonthName:   month.MonthName,
                AmountDue:   due,
                AmountPaid:  nowPaying,
                TotalPaid:   totalPaidAfter,
                Balance:     Math.Max(0m, due - totalPaidAfter),
                Status:      status));

            if (remaining <= 0m) break;
        }

        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ComputeBalance — override-aware version
    // ─────────────────────────────────────────────────────────────────────────

    public static TermBalanceSummary ComputeBalance(
        IReadOnlyList<TermMonth>              termMonths,
        decimal                               termFee,
        IReadOnlyList<ExistingAllocation>     existingBreakdowns,
        int?                                  startingTermMonthId = null,
        IReadOnlyDictionary<int, decimal>?    monthDues           = null)
    {
        if (termMonths.Count == 0)
            return new TermBalanceSummary(0m, 0m, 0m);

        int     monthCount    = termMonths.Count;
        decimal flatMonthly   = Math.Round(termFee / monthCount, 2);
        decimal flatLastMonth = termFee - flatMonthly * (monthCount - 1);

        var paidMap = existingBreakdowns
            .GroupBy(e => e.TermMonthId)
            .ToDictionary(g => g.Key, g => g.Sum(e => e.AmountAlreadyPaid));

        decimal totalDue  = 0m;
        decimal totalPaid = 0m;

        bool reachedStart = !startingTermMonthId.HasValue;

        for (int i = 0; i < termMonths.Count; i++)
        {
            if (!reachedStart)
            {
                if (termMonths[i].Id == startingTermMonthId!.Value)
                    reachedStart = true;
                else
                    continue;
            }

            decimal due;
            if (monthDues is not null && monthDues.TryGetValue(termMonths[i].Id, out var overrideDue))
                due = overrideDue;
            else
                due = i == monthCount - 1 ? flatLastMonth : flatMonthly;

            totalDue  += due;
            totalPaid += paidMap.GetValueOrDefault(termMonths[i].Id, 0m);
        }

        return new TermBalanceSummary(totalDue, totalPaid, Math.Max(0m, totalDue - totalPaid));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BuildMonthDues — converts EffectiveFeeDto.Months into the map used above.
    // Call this in the orchestrator and service to get override-aware per-month dues.
    // ─────────────────────────────────────────────────────────────────────────

    public static Dictionary<int, decimal> BuildMonthDues(
        IEnumerable<SchoolPaymentSystem.DTO.Fees.TermMonthFeeDto> months) =>
        months.ToDictionary(m => m.TermMonthId, m => m.TuitionDue);
}
