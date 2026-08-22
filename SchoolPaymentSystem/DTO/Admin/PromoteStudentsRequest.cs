namespace SchoolPaymentSystem.DTO.Admin;

public record PromoteStudentsRequest(
    int  FromAcademicYearId,
    int  ToAcademicYearId,
    bool SkipTopGrade = true   // students in highest grade are not promoted
    );