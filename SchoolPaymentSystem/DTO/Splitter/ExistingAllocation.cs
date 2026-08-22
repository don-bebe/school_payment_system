namespace SchoolPaymentSystem.DTO.Splitter;

public record ExistingAllocation(
    int     TermMonthId,
    decimal AmountAlreadyPaid
    );