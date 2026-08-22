namespace SchoolPaymentSystem.DTO.Reports;

public record DailyReportDto(
    DateTime ReportDate,

    // Income breakdown per method + currency (includes IsPrepayment flag per row)
    List<IncomeByMethodDto> IncomeByMethod,

    // USD cash income only (what physically came in, in USD)
    decimal CashIncome,

    // ZIG cash income — kept separate, never added to USD
    decimal CashIncomeZig,

    // USD equivalent of all ZiG payments (sum of AmountUsd for ZiG payments)
    decimal CashIncomeZigAsUsd,

    decimal PrepaymentTotal,     // estimated in-kind value
    int     PrepaymentCount,     // number of in-kind transactions

    // Expense breakdown by category
    List<ExpensesByCategoryDto> ExpensesByCategory,
    decimal TotalExpenses,       // USD expenses only
    decimal TotalExpensesZig,    // raw ZiG expenses
    decimal TotalExpensesZigAsUsd, // ZiG expenses converted to USD

    decimal Balance,             // (USD income + ZiG-as-USD income) - (USD expenses + ZiG-as-USD expenses)

    int PaymentCount,
    int ExpenseCount,

    // Full row-level detail for PDF generation
    List<PaymentLineItemDto>  PaymentLines,
    List<ExpenseLineItemDto>  ExpenseLines,

    // Fee-type breakdown — how much was collected per fee type in this period
    List<FeeTypeBreakdownDto> FeeTypeBreakdown,

    // Who generated this report (for signature on printed copy)
    string  GeneratedByName,
    string? GeneratedBySignature   // base64 data URI of signature image, or null
);