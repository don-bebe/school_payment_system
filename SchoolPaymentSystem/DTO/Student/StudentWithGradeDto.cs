namespace SchoolPaymentSystem.DTO.Student;

public record StudentWithGradeDto(
    int      Id,
    string   StudentNumber,
    string   FirstName,
    string   Surname,
    string   FullName,
    string   Gender,
    string   GradeName,
    int      GradeId,
    string   GuardianName,
    string   GuardianPhone,
    DateTime EnrollmentDate,
    bool     IsActive,
    bool     IsGraduated,
    int?     StartingTermMonthId
);