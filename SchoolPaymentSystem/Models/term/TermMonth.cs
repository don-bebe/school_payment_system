using SchoolPaymentSystem.Models.payment;

namespace SchoolPaymentSystem.Models.term;

public class TermMonth
{
    public int    Id         { get; set; }
    public int    TermId     { get; set; }
    public int    MonthNumber { get; set; }    // 1=Jan … 12=Dec
    public string MonthName  { get; set; } = string.Empty;   // "January"
    public int    SortOrder  { get; set; }    // order within the term

    // ── Navigation ──────────────────────────────────────────────────────────
    public Term                        Term                  { get; set; } = null!;
    public ICollection<PaymentBreakdown> PaymentBreakdowns   { get; set; } = [];
}