namespace SchoolPaymentSystem.DTO.Notifications;

public record DashboardSummaryDto(
    // Students
    int     TotalStudents,
    int     ActiveStudents,

    // Current term finances — per currency
    string  ActiveTermName,
    string  ActiveAcademicYear,
    decimal TotalFeesExpected,       // always in USD (term fees are configured in USD)
    decimal TotalFeesCollected,      // USD collected (cash + prepayment, USD only)
    decimal TotalFeesOutstanding,
    decimal CollectionRate,

    // Cash-only figures (excludes PREPAYMENT, USD only)
    decimal CashFeesCollected,
    decimal CashCollectionRate,

    // ZIG collected separately — never mixed with USD
    decimal ZigFeesCollected,
    decimal ZigCashCollected,

    // Prepayment / in-kind
    decimal PrepaymentTotal,
    int     PrepaymentCount,

    // Today — split by currency
    decimal TodayIncomeUsd,          // real cash USD received today
    decimal TodayIncomeZig,          // real cash ZIG received today
    decimal TodayPrepayment,         // in-kind estimated value today
    decimal TodayExpenses,           // expenses (USD)
    decimal TodayBalance,            // TodayIncomeUsd - TodayExpenses (USD cash balance)
    int     TodayPaymentCount,

    // Payment method split for today
    List<MethodTodayDto> TodayByMethod,

    // Arrears snapshot
    int     StudentsWithArrears,

    // Recent payments (last 10)
    List<RecentPaymentDto> RecentPayments
    );