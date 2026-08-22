namespace SchoolPaymentSystem.DTO.Reports;

public record StudentArrearsDto(
    int     StudentId,
    string  StudentNumber,
    string  FullName,
    string  GradeName,
    decimal TotalDue,
    decimal TotalPaid,
    decimal TotalOwing
    );