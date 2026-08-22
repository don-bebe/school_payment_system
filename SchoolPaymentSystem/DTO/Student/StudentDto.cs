using SchoolPaymentSystem.Models.user;

namespace SchoolPaymentSystem.DTO.Student;

public record StudentDto(
    int       Id,
    string    StudentNumber,
    string    FirstName,
    string    Surname,
    string    FullName,
    DateTime  DateOfBirth,
    string    Gender,
    string    GuardianName,
    string    GuardianPhone,
    string?   GuardianEmail,
    string?   Address,
    bool      IsActive,
    bool      IsGraduated,
    DateTime  EnrollmentDate,
    int?      StartingTermMonthId,
    bool      IsStaffChild,
    int?      GuardianGroupId,
    bool      OwesAdmissionFee,      // true = student still owes admission fee
    bool      SkipsGrade6RegistrationArrear, // true = enrolled at Grade 7, never owed Grade 6 reg fee
    string    DeactivationReason,    // "None" | "Transferred" | "Deceased" | "Graduated"
    string?   DeactivationNotes,
    DateTime? DeactivatedAt,
    string?   GradeName,             // convenience: current grade name, null if no history
    int?      GradeId,               // current grade ID (for edit form pre-fill)
    int?      AcademicYearId         // current academic year ID (for edit form pre-fill)
);

/// <summary>Request to deactivate a student with a reason.</summary>
public record DeactivateStudentRequest(
    /// <summary>"Transferred" | "Deceased" | "Graduated"</summary>
    string  Reason,
    string? Notes
);

/// <summary>A single row in the bulk-enrol grid.</summary>
public record BulkEnrolStudentRow(
    string   FirstName,
    string   Surname,
    DateTime DateOfBirth,
    string   Gender,
    string   GuardianName,
    string   GuardianPhone,
    string?  GuardianEmail,
    int      GradeId,
    bool     IsStaffChild,
    int?     GuardianGroupId
);

/// <summary>Bulk enrol up to 10 existing students in one transaction.</summary>
public record BulkEnrolRequest(
    int                       AcademicYearId,
    int?                      StartingTermMonthId,
    List<BulkEnrolStudentRow> Students
);

/// <summary>Result of a bulk enrol operation.</summary>
public record BulkEnrolResultDto(
    int              Enrolled,
    int              Skipped,
    List<string>     SkippedReasons,
    List<StudentDto> Created
);

/// <summary>One member of a sibling group, returned by the siblings lookup.</summary>
public record SiblingDto(
    int    StudentId,
    string StudentNumber,
    string FullName,
    string GradeName,
    int    GradeLevel,
    string GuardianPhone,
    bool   GetsDiscount   // true when sibling rule gives this student reduced fees
);
