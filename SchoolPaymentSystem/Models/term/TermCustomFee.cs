namespace SchoolPaymentSystem.Models.term;

/// <summary>
/// An admin-defined extra fee component attached to a specific TermFee (term + grade).
/// Examples: "Computer Lab Fee", "Exam Fee".
/// Unlike tuition and sports levy, custom fees can be charged on specific months only.
/// </summary>
public class TermCustomFee
{
    public int     Id        { get; set; }
    public int     TermFeeId { get; set; }   // FK → TermFee
    public string  Name      { get; set; } = string.Empty;   // e.g. "Computer Lab Fee"
    public decimal Amount    { get; set; }

    /// <summary>
    /// Comma-separated TermMonth IDs on which this fee is charged.
    /// E.g. "12,13" means months with IDs 12 and 13.
    /// </summary>
    public string ApplicableTermMonthIds { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    // ── Navigation ──────────────────────────────────────────────────────────
    public TermFee TermFee { get; set; } = null!;

    // ── Helpers ──────────────────────────────────────────────────────────────
    public IReadOnlyList<int> GetApplicableMonthIds() =>
        string.IsNullOrWhiteSpace(ApplicableTermMonthIds)
            ? []
            : ApplicableTermMonthIds
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(int.Parse)
                .ToList();

    public void SetApplicableMonthIds(IEnumerable<int> ids) =>
        ApplicableTermMonthIds = string.Join(',', ids);
}
