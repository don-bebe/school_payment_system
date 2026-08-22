namespace SchoolPaymentSystem.DTO.Grade;

public record PromoteRequest(
    int FromAcademicYearId, int ToAcademicYearId
    );