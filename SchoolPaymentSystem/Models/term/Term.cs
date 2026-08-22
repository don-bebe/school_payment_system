using SchoolPaymentSystem.Models.fees;
using SchoolPaymentSystem.Models.payment;

namespace SchoolPaymentSystem.Models.term;

public class Term
{
    public int    Id             { get; set; }
    public int    AcademicYearId { get; set; }
    public int    TermNumber     { get; set; }   // 1, 2, 3
    public string Name           { get; set; } = string.Empty;  // "Term 1"
    public DateTime StartDate    { get; set; }
    public DateTime EndDate      { get; set; }
    public bool   IsActive       { get; set; } = false;
    
    // ── Navigation ──────────────────────────────────────────────────────────
    public AcademicYear           AcademicYear { get; set; } = null!;
    public ICollection<TermFee>   TermFees     { get; set; } = [];
    public ICollection<TermMonth> TermMonths   { get; set; } = [];
    public ICollection<Payment>   Payments     { get; set; } = [];
    public ICollection<TripSetting> TripSettings { get; set; } = [];
    public ICollection<TermExtensionMonth> ExtensionMonths { get; set; } = [];
}