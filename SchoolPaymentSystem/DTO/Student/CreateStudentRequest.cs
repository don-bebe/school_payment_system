namespace SchoolPaymentSystem.DTO.Student;

public record CreateStudentRequest(
    string   FirstName,
    string   Surname,
    DateTime DateOfBirth,
    string   Gender,
    string   GuardianName,
    string   GuardianPhone,
    string?  GuardianEmail,
    string?  Address,
    int      GradeId,
    int      AcademicYearId,
    int?     StartingTermMonthId,

    /// <summary>Marks this student for staff-child fee rates.</summary>
    bool     IsStaffChild = false,

    /// <summary>
    /// Groups siblings under one guardian for the sibling-rule check.
    /// All children of the same parent share the same GuardianGroupId.
    /// </summary>
    int?     GuardianGroupId = null,

    /// <summary>
    /// Set true when the student owes an admission fee at enrolment.
    /// Leave false for bulk-enrolled existing students.
    /// </summary>
    bool     OwesAdmissionFee = false,

    /// <summary>
    /// Set true when the student is enrolled directly into Grade 7 (or higher),
    /// having never attended Grade 6 at this school. This prevents their first
    /// Grade 7 registration fee from being doubled as if they had a Grade 6 arrear.
    /// </summary>
    bool     SkipsGrade6RegistrationArrear = false
);