namespace SchoolPaymentSystem.DTO.Student;

/// <summary>
/// A graduated (or otherwise deactivated) student shown on the Alumni page,
/// with their cumulative balance across all academic years.
/// </summary>
public record GraduatedStudentDto(
    int      StudentId,
    string   StudentNumber,
    string   FullName,
    string   Gender,
    string   GuardianName,
    string   GuardianPhone,
    string   DeactivationReason,   // "Graduated" | "Transferred" | "Deceased"
    string?  DeactivationNotes,
    DateTime? DeactivatedAt,
    string   LastGrade,            // grade name from the most recent history record
    string   LastYear,             // academic year name from the most recent history record
    decimal  TotalPaid,
    decimal  TotalDue,
    decimal  Balance,              // 0 = settled / written off
    bool     HasWrittenOff         // true if any arrears were previously cleared
);

/// <summary>
/// Reason and optional notes when writing off a student's outstanding arrears.
/// </summary>
public record ClearArrearsRequest(
    /// <summary>
    /// Why the arrears are being cleared — shown in the audit log.
    /// e.g. "Student graduated", "Debt forgiven", "Error correction"
    /// </summary>
    string  Reason,
    string? Notes
);
