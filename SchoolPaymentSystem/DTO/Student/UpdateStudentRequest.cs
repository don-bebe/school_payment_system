namespace SchoolPaymentSystem.DTO.Student;

public record UpdateStudentRequest(
    string   FirstName,
    string   Surname,
    DateTime DateOfBirth,
    string   Gender,
    string   GuardianName,
    string   GuardianPhone,
    string?  GuardianEmail,
    string?  Address,
    bool     IsStaffChild    = false,
    int?     GuardianGroupId = null,
    bool     OwesAdmissionFee = false,
    bool     SkipsGrade6RegistrationArrear = false,
    /// <summary>
    /// Optional: supply both GradeId and AcademicYearId to correct a student's
    /// grade placement. If the student already has a history record for the given
    /// academic year it will be updated to the new grade; otherwise a new record
    /// will be created.
    /// </summary>
    int?     GradeId = null,
    int?     AcademicYearId = null
    );