namespace SchoolPaymentSystem.DTO.Grade;

public record SetTermFeeRequest(
    int      TermId,
    int      GradeId,
    decimal  TuitionAmount,
    decimal  SportsLevyAmount,
    decimal? StaffChildTuitionAmount,
    decimal? StaffChildSportsLevyAmount
);