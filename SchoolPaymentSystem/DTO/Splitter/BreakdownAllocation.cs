using SchoolPaymentSystem.Models.payment;

namespace SchoolPaymentSystem.DTO.Splitter;

public record BreakdownAllocation(
    int                 TermMonthId,
    string              MonthName,
    decimal             AmountDue,
    decimal             AmountPaid,    // portion allocated from the CURRENT payment
    decimal             TotalPaid,     // cumulative across all payments
    decimal             Balance,
    MonthPaymentStatus  Status
    );