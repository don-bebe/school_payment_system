using SchoolPaymentSystem.Models.term;

namespace SchoolPaymentSystem.Models.grade;

public class Grade
{
    public int    Id          { get; set; }
    public string Name        { get; set; } = string.Empty;   // "Grade 2", "ECD A"
    public int    Level       { get; set; }                    // 0=ECD A, 1=ECD B, 2=Grade1 …
    public string? Description { get; set; }
    public bool   IsActive    { get; set; } = true;
    
    // ── Navigation ──────────────────────────────────────────────────────────
    public ICollection<StudentGradeHistory> StudentGradeHistories { get; set; } = [];
    public ICollection<TermFee>             TermFees               { get; set; } = [];
}