using SchoolPaymentSystem.Models.term;
using SchoolPaymentSystem.Models.user;

namespace SchoolPaymentSystem.Models.grade;

public class StudentGradeHistory
{
    public int  Id             { get; set; }
    public int  StudentId      { get; set; }
    public int  GradeId        { get; set; }
    public int  AcademicYearId { get; set; }
    public bool IsActive       { get; set; } = true;  // current enrolment
    
    public int? StartingTermMonthId { get; set; }
    
    public bool IsGraduated { get; set; } = false;

    // ── Navigation ──────────────────────────────────────────────────────────
    public Student      Student          { get; set; } = null!;
    public Grade        Grade            { get; set; } = null!;
    public AcademicYear AcademicYear     { get; set; } = null!;
    public TermMonth?   StartingTermMonth { get; set; }
}