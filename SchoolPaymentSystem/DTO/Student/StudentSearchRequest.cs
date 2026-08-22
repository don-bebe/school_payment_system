namespace SchoolPaymentSystem.DTO.Student;

public record StudentSearchRequest(
    string? Query,           // student number OR name fragment
    int?    GradeId,
    string? Gender,          // "Male" | "Female" | null = all
    int?    AcademicYearId,
    bool?   IsActive,        // null = all, true = active only, false = inactive/graduated only
    int     Page     = 1,
    int     PageSize = 20
    );