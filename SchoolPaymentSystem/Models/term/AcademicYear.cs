using SchoolPaymentSystem.Models.expenses;
using SchoolPaymentSystem.Models.fees;
using SchoolPaymentSystem.Models.grade;
using SchoolPaymentSystem.Models.payment;

namespace SchoolPaymentSystem.Models.term;

public class AcademicYear
{
    public int    Id        { get; set; }
    public int    Year      { get; set; }           // e.g. 2026
    public string Name      { get; set; } = string.Empty;  // "2026"
    public bool   IsActive  { get; set; } = false;  // only one active at a time
    public DateTime CreatedAt { get; set; } = DateTime.Now;

    // ── Navigation ──────────────────────────────────────────────────────────
    public ICollection<Term>                Terms                  { get; set; } = [];
    public ICollection<StudentGradeHistory> StudentGradeHistories  { get; set; } = [];
    public ICollection<Payment>             Payments               { get; set; } = [];
    public ICollection<Expense>             Expenses               { get; set; } = [];

    // Standalone fee settings scoped to this academic year
    public RegistrationFeeSetting? RegistrationFeeSetting { get; set; }
    public ReportBookSetting?      ReportBookSetting      { get; set; }
    public AdmissionFeeSetting?    AdmissionFeeSetting    { get; set; }
    public TransportFeeSetting?    TransportFeeSetting    { get; set; }
    public ProjectFeeSetting?      ProjectFeeSetting      { get; set; }
}