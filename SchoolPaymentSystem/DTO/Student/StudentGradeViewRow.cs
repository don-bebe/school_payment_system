namespace SchoolPaymentSystem.DTO.Student;

public record ExtensionMonthCell(
    int     ExtensionMonthId,
    string  MonthName,
    decimal AmountDue,
    decimal AmountPaid,
    decimal Balance,
    string  Status   // "Paid" | "Partial" | "Unpaid" | "N/A"
);

public record StudentGradeViewRow(
    int      StudentId,
    string   StudentNumber,
    string   FullName,
    List<MonthStatusCell> Months,
    decimal  TotalDue,
    decimal  TotalPaid,
    decimal  TotalOwing,
    string   OverallStatus,   // "Paid" | "Partial" | "Owing"
    decimal  SportsDue,
    decimal  SportsPaid,
    decimal  SportsBalance,
    // Previous-term arrears (within year + prior years)
    decimal  ArrearsAmount = 0m,
    string?  ArrearsSummary = null,   // e.g. "Term 1: $35.00, 2025 Term 3: $20.00"
    // Extension month fee cells (only populated for grades that have them configured)
    List<ExtensionMonthCell>? ExtensionCells = null
);