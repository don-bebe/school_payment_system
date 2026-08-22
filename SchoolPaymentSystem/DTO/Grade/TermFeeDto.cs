namespace SchoolPaymentSystem.DTO.Grade;

public record TermFeeDto(
    int      Id,
    int      TermId,
    string   TermName,
    int      GradeId,
    string   GradeName,
    decimal  TuitionAmount,
    decimal  SportsLevyAmount,
    decimal? StaffChildTuitionAmount,
    decimal? StaffChildSportsLevyAmount,
    List<TermMonthFeeInfo>? MonthFees = null
);

/// <summary>Per-month tuition override already saved for this TermFee.</summary>
public record TermMonthFeeInfo(
    int     Id,
    int     TermMonthId,
    string  MonthName,
    decimal OverrideAmount
);