namespace SchoolPaymentSystem.DTO.Reports;

// ─── Transport Report ─────────────────────────────────────────────────────────

public record TransportPaymentRow(
    int      StudentId,
    string   StudentName,
    string   StudentNumber,
    string   GradeName,
    string   MonthName,
    decimal  AmountPaid,
    decimal  MonthlyFee,
    decimal  Balance,
    string   Currency,
    DateTime PaidAt,
    string   PaymentMethod,
    string   ReceiptNumber,
    int?     DaysEntitled,
    int?     TotalSchoolDays,
    string?  Notes
);

public record TransportReportRequest(
    DateTime? From,
    DateTime? To,
    int?      GradeId,
    int?      TermId
);

// ─── Trip Report ──────────────────────────────────────────────────────────────

public record TripPaymentRow(
    int      StudentId,
    string   StudentName,
    string   StudentNumber,
    string   GradeName,
    string   TripName,
    decimal  AmountPaid,
    string   Currency,
    DateTime PaidAt,
    string   PaymentMethod,
    string   ReceiptNumber
);

public record TripReportRequest(
    DateTime? From,
    DateTime? To,
    int?      GradeId,
    int?      TermId,
    int?      TripSettingId   // filter to a specific trip
);

// ─── Standalone Fees Report (Registration Fee & Project Fee) ──────────────────

/// <summary>
/// Aggregated row: shows the TOTAL paid by a student for a fee type,
/// not individual transactions. This prevents duplicate rows when a student
/// makes multiple partial payments.
/// </summary>
public record StandaloneFeeRow(
    int      StudentId,
    string   StudentName,
    string   StudentNumber,
    string   GradeName,
    string   FeeType,         // "Registration Fee" | "Project Fee"
    decimal  TotalPaid,       // sum across all payments
    decimal  FeeDue,          // configured amount owed
    decimal  Balance,         // FeeDue - TotalPaid
    string   Currency,
    DateTime LastPaymentAt,   // most recent payment date
    string   PaymentMethod,   // method of most recent payment
    string   ReceiptNumbers   // comma-separated receipt numbers
);

public record StandaloneFeesReportRequest(
    int    AcademicYearId,
    string FeeType    // "registration" | "project" | "all"
);

// ─── Transfer Log ─────────────────────────────────────────────────────────────

public record TransferLogRow(
    int             Id,
    int             StudentId,
    string          StudentName,
    string          StudentNumber,
    int             PaymentId,
    string          ReceiptNumber,
    string?         SourceFeeType,    // null = surplus-from-payment
    string?         SourceLabel,
    string          TargetFeeType,
    string          TargetLabel,
    decimal         Amount,
    string?         Reason,
    bool            IsStandaloneTransfer,
    DateTime        TransferredAt,
    string          TransferredByName
);
