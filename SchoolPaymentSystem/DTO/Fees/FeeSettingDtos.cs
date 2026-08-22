namespace SchoolPaymentSystem.DTO.Fees;

// ── Registration Fee ─────────────────────────────────────────────────────────

public record RegistrationFeeSettingDto(
    int     Id,
    int     AcademicYearId,
    string  AcademicYearName,
    decimal Amount
);

public record SetRegistrationFeeRequest(
    int     AcademicYearId,
    decimal Amount
);

// ── Report Book ───────────────────────────────────────────────────────────────

public record ReportBookSettingDto(
    int     Id,
    int     AcademicYearId,
    string  AcademicYearName,
    decimal Amount
);

public record SetReportBookFeeRequest(
    int     AcademicYearId,
    decimal Amount
);

// ── Admission Fee ─────────────────────────────────────────────────────────────

public record AdmissionFeeSettingDto(
    int     Id,
    int     AcademicYearId,
    string  AcademicYearName,
    decimal Amount
);

public record SetAdmissionFeeRequest(
    int     AcademicYearId,
    decimal Amount
);

// ── Transport Fee ─────────────────────────────────────────────────────────────

public record TransportFeeSettingDto(
    int     Id,
    int     AcademicYearId,
    string  AcademicYearName,
    decimal MonthlyAmount
);

public record SetTransportFeeRequest(
    int     AcademicYearId,
    decimal MonthlyAmount
);

// ── Project Fee ───────────────────────────────────────────────────────────────

public record ProjectFeeSettingDto(
    int     Id,
    int     AcademicYearId,
    string  AcademicYearName,
    decimal Amount
);

public record SetProjectFeeRequest(
    int     AcademicYearId,
    decimal Amount
);

// ── Uniform Items ─────────────────────────────────────────────────────────────

public record UniformItemDto(
    int     Id,
    string  Name,
    string  Gender,   // "Boys" | "Girls" | "Both"
    decimal Price,
    bool    IsActive
);

public record CreateUniformItemRequest(
    string  Name,
    string  Gender,
    decimal Price
);

public record UpdateUniformItemRequest(
    string  Name,
    string  Gender,
    decimal Price,
    bool    IsActive
);

// ── Trips ─────────────────────────────────────────────────────────────────────

public record TripSettingDto(
    int      Id,
    int      TermId,
    string   TermName,
    string   Name,
    decimal  Amount,
    bool     IsActive,
    DateTime CreatedAt
);

public record CreateTripRequest(
    int     TermId,
    string  Name,
    decimal Amount
);

public record UpdateTripRequest(
    string  Name,
    decimal Amount,
    bool    IsActive
);

// ── Term Custom Fees ──────────────────────────────────────────────────────────

public record TermCustomFeeDto(
    int          Id,
    int          TermFeeId,
    string       Name,
    decimal      Amount,
    List<int>    ApplicableTermMonthIds,
    bool         IsActive
);

public record CreateCustomFeeRequest(
    int          TermFeeId,
    string       Name,
    decimal      Amount,
    List<int>    ApplicableTermMonthIds
);

public record UpdateCustomFeeRequest(
    string       Name,
    decimal      Amount,
    List<int>    ApplicableTermMonthIds,
    bool         IsActive
);

public record TermMonthFeeSettingDto(
    int     Id,
    int     TermFeeId,
    int     TermMonthId,
    string  MonthName,
    decimal OverrideAmount
);

public record SetTermMonthFeeRequest(
    int     TermFeeId,
    int     TermMonthId,
    decimal OverrideAmount
);

public record DeleteTermMonthFeeRequest(
    int TermFeeId,
    int TermMonthId
);

// ── Effective fee resolved for a specific student ────────────────────────────

/// <summary>
/// The fully resolved fee picture for a student in a given term —
/// accounts for staff child overrides and the sibling rule.
/// Returned by IFeeRuleService and consumed by the payment UI.
/// </summary>
public record EffectiveFeeDto(
    decimal  TuitionAmount,
    decimal  SportsLevyAmount,
    bool     IsStaffChildRate,
    /// <summary>Monthly tuition slice (TuitionAmount ÷ term months).</summary>
    decimal  MonthlyTuition,
    /// <summary>Term months in sort order — used by the payment UI splitter preview.</summary>
    List<TermMonthFeeDto> Months
);

public record TermMonthFeeDto(
    int     TermMonthId,
    string  MonthName,
    int     SortOrder,
    decimal TuitionDue,
    decimal TuitionPaid,
    decimal TuitionBalance
);
