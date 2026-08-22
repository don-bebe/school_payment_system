namespace SchoolPaymentSystem.DTO.Grade;

// ── Response DTOs ─────────────────────────────────────────────────────────────

public record TermExtensionFeeDto(
    int     Id,
    int     GradeId,
    string  GradeName,
    decimal Amount
);

public record TermExtensionMonthDto(
    int    Id,
    int    TermId,
    int    MonthNumber,
    string MonthName,
    bool   IsActive,
    List<TermExtensionFeeDto> Fees
);

// ── Request DTOs ──────────────────────────────────────────────────────────────

/// <summary>Add an extension month to a term.</summary>
public record AddTermExtensionMonthRequest(
    int TermId,
    int MonthNumber
);

/// <summary>Set (create or update) the fee for one grade on an extension month.</summary>
public record SetExtensionFeeRequest(
    int     TermExtensionMonthId,
    int     GradeId,
    decimal Amount
);

/// <summary>Remove one grade's fee from an extension month.</summary>
public record RemoveExtensionFeeRequest(
    int TermExtensionMonthId,
    int GradeId
);
