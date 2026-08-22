using SchoolPaymentSystem.Models.fees;
using SchoolPaymentSystem.Models.grade;
using SchoolPaymentSystem.Models.payment;

namespace SchoolPaymentSystem.Models.user;

public class Student
{
    public int     Id            { get; set; }
    public string  StudentNumber { get; set; } = string.Empty;  // SCH-2026-0001
    public string  FirstName     { get; set; } = string.Empty;
    public string  Surname       { get; set; } = string.Empty;
    public DateTime DateOfBirth  { get; set; }
    public string  Gender        { get; set; } = string.Empty;  // "Male" | "Female"

    // Guardian / Contact
    public string  GuardianName  { get; set; } = string.Empty;
    public string  GuardianPhone { get; set; } = string.Empty;
    public string? GuardianEmail { get; set; }
    public string? Address       { get; set; }

    /// <summary>
    /// Groups siblings under one guardian for the sibling-rule check.
    /// All children of the same parent/guardian share the same GuardianGroupId.
    /// When a guardian has 3+ active enrolled children, the one in the highest
    /// grade is automatically treated as a staff child for fee purposes.
    /// </summary>
    public int?    GuardianGroupId { get; set; }

    // Staff child
    /// <summary>
    /// When true, this student's fees use the staff-child rates configured
    /// in TermFee (StaffChildTuitionAmount / StaffChildSportsLevyAmount).
    /// Also set automatically by the sibling rule at payment time.
    /// </summary>
    public bool    IsStaffChild   { get; set; } = false;

    /// <summary>
    /// Set to true during enrolment when the student owes an admission/registration
    /// fee. Cleared automatically once the fee is paid. Bulk-enrolled students
    /// (existing students being entered into the system) should have this left false.
    /// </summary>
    public bool    OwesAdmissionFee { get; set; } = false;

    /// <summary>
    /// Set to true when a student is enrolled directly into Grade 7 (skipping Grade 6).
    /// This prevents the system from treating the missing Grade 6 registration fee
    /// as an arrear — the student was never in Grade 6, so they never owed it.
    /// </summary>
    public bool    SkipsGrade6RegistrationArrear { get; set; } = false;

    // Status
    public DateTime EnrollmentDate      { get; set; } = DateTime.Now;
    public bool     IsActive            { get; set; } = true;
    public StudentDeactivationReason DeactivationReason { get; set; } = StudentDeactivationReason.None;
    public DateTime? DeactivatedAt      { get; set; }
    public string?   DeactivationNotes  { get; set; }

    // ── Navigation ──────────────────────────────────────────────────────────
    public ICollection<StudentGradeHistory>   GradeHistories         { get; set; } = [];
    public ICollection<Payment>               Payments               { get; set; } = [];
    public ICollection<RegistrationFeePayment> RegistrationFeePayments { get; set; } = [];
    public ICollection<ReportBookPayment>     ReportBookPayments     { get; set; } = [];
    public ICollection<AdmissionFeePayment>   AdmissionFeePayments   { get; set; } = [];
    public ICollection<TransportFeePayment>   TransportFeePayments   { get; set; } = [];
    public ICollection<TripPaymentRecord>     TripPaymentRecords     { get; set; } = [];
    public ICollection<ProjectFeePayment>     ProjectFeePayments     { get; set; } = [];
}

public enum StudentDeactivationReason
{
    None,          // student is active
    Transferred,   // moved to another school
    Deceased,
    Graduated      // completed the highest grade
}