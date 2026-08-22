namespace SchoolPaymentSystem.DTO.Splitter;

public record TermBalanceSummary(
    decimal TotalDue,
    decimal TotalPaid,
    decimal TotalOwing
    );