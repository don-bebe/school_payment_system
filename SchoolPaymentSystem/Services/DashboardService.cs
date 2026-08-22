using Microsoft.EntityFrameworkCore;
using SchoolPaymentSystem.Data;
using SchoolPaymentSystem.DTO.Notifications;
using SchoolPaymentSystem.Models.payment;
using SchoolPaymentSystem.Services.Interfaces;

public class DashboardService : IDashboardService
{
    private readonly ApplicationDbContext _db;

    public DashboardService(ApplicationDbContext db) => _db = db;

    public async Task<DashboardSummaryDto> GetSummaryAsync()
    {
        // ── Active term / year ────────────────────────────────────────────────
        var activeTerm = await _db.Term.AsNoTracking()
            .Include(t => t.AcademicYear)
            .FirstOrDefaultAsync(t => t.IsActive);

        var termName = activeTerm?.Name               ?? "No active term";
        var yearName = activeTerm?.AcademicYear?.Name ?? "—";
        var termId   = activeTerm?.Id;
        var yearId   = activeTerm?.AcademicYearId;

        // ── Students ──────────────────────────────────────────────────────────
        var totalStudents  = await _db.Student.CountAsync();
        var activeStudents = await _db.Student.CountAsync(s => s.IsActive);

        // ── Fees expected vs collected ────────────────────────────────────────
        decimal feesExpected    = 0m;
        // USD only
        decimal usdCollected    = 0m;
        decimal usdCash         = 0m;
        decimal usdPrepayment   = 0m;
        // ZIG only
        decimal zigCollected    = 0m;
        decimal zigCash         = 0m;
        int     prepaymentCount = 0;
        int     studentsOwing   = 0;

        if (termId.HasValue && yearId.HasValue)
        {
            // Expected fees are always configured in USD
            var gradeEnrolments = await _db.StudentGradeHistory.AsNoTracking()
                .Where(h => h.AcademicYearId == yearId && h.IsActive)
                .GroupBy(h => h.GradeId)
                .Select(g => new { GradeId = g.Key, Count = g.Count() })
                .ToListAsync();

            var termFees = await _db.TermFee.AsNoTracking()
                .Where(f => f.TermId == termId)
                .ToListAsync();

            foreach (var enrolment in gradeEnrolments)
            {
                var fee = termFees.FirstOrDefault(f => f.GradeId == enrolment.GradeId);
                if (fee is not null)
                    feesExpected += fee.TuitionAmount * enrolment.Count;
            }

            var termPayments = await _db.Payment.AsNoTracking()
                .Include(p => p.PaymentMethod)
                .Where(p => p.TermId         == termId
                         && p.AcademicYearId == yearId
                         && p.Status         == PaymentStatus.Completed)
                .ToListAsync();

            // Sum per currency — never mix USD and ZIG
            usdCollected  = termPayments.Where(p => p.Currency == "USD").Sum(p => p.AmountPaid);
            usdCash       = termPayments.Where(p => p.Currency == "USD"
                                                 && p.PaymentMethod.Code != "PREPAYMENT").Sum(p => p.AmountPaid);
            usdPrepayment = termPayments.Where(p => p.Currency == "USD"
                                                 && p.PaymentMethod.Code == "PREPAYMENT").Sum(p => p.AmountPaid);
            zigCollected  = termPayments.Where(p => p.Currency == "ZIG").Sum(p => p.AmountPaid);
            zigCash       = termPayments.Where(p => p.Currency == "ZIG"
                                                 && p.PaymentMethod.Code != "PREPAYMENT").Sum(p => p.AmountPaid);
            prepaymentCount = termPayments.Count(p => p.PaymentMethod.Code == "PREPAYMENT");

            var allStudentIds  = await _db.StudentGradeHistory.AsNoTracking()
                .Where(h => h.AcademicYearId == yearId && h.IsActive)
                .Select(h => h.StudentId).ToListAsync();
            var paidStudentIds = termPayments.Select(p => p.StudentId).Distinct().ToList();
            studentsOwing = allStudentIds.Except(paidStudentIds).Count();
        }

        // Collection rate uses USD only (fees are denominated in USD)
        var collectionRate     = feesExpected > 0
            ? Math.Round(usdCollected / feesExpected * 100, 1) : 0m;
        var cashCollectionRate = feesExpected > 0
            ? Math.Round(usdCash      / feesExpected * 100, 1) : 0m;

        // ── Today ──────────────────────────────────────────────────────────────
        var todayStart = DateTime.Now.Date;
        var todayEnd   = todayStart.AddDays(1);

        var todayPayments = await _db.Payment.AsNoTracking()
            .Include(p => p.PaymentMethod)
            .Include(p => p.Receipt)
            .Where(p => p.PaymentDate >= todayStart
                     && p.PaymentDate <  todayEnd
                     && p.Status      == PaymentStatus.Completed)
            .ToListAsync();

        var todayExpenses = await _db.Expense.AsNoTracking()
            .Where(e => e.ExpenseDate >= todayStart
                     && e.ExpenseDate <  todayEnd
                     && e.Currency    == "USD")          // expenses are USD
            .SumAsync(e => e.Amount);

        // Cash income per currency — never summed together
        var todayIncomeUsd = todayPayments
            .Where(p => p.Currency == "USD" && p.PaymentMethod.Code != "PREPAYMENT")
            .Sum(p => p.AmountPaid);
        var todayIncomeZig = todayPayments
            .Where(p => p.Currency == "ZIG" && p.PaymentMethod.Code != "PREPAYMENT")
            .Sum(p => p.AmountPaid);
        var todayPrepayment = todayPayments
            .Where(p => p.PaymentMethod.Code == "PREPAYMENT")
            .Sum(p => p.AmountPaid);

        // Group by method AND currency so ZIG EcoCash and USD EcoCash are separate rows
        var todayByMethod = todayPayments
            .GroupBy(p => new { p.PaymentMethod.Name, p.PaymentMethod.Code, p.Currency })
            .Select(g => new MethodTodayDto(
                g.Key.Name,
                g.Key.Code,
                g.Key.Currency,
                g.Sum(p => p.AmountPaid),
                g.Count(),
                g.Key.Code == "PREPAYMENT"))
            .OrderBy(m => m.IsPrepayment)
            .ThenBy(m => m.Currency)
            .ThenBy(m => m.MethodName)
            .ToList();

        // ── Recent payments ───────────────────────────────────────────────────
        var recent = await _db.Payment.AsNoTracking()
            .Include(p => p.Student)
            .Include(p => p.PaymentMethod)
            .Include(p => p.Receipt)
            .Where(p => p.Status == PaymentStatus.Completed)
            .OrderByDescending(p => p.PaymentDate)
            .Take(10)
            .Select(p => new RecentPaymentDto(
                p.Id,
                p.Student.FirstName + " " + p.Student.Surname,
                p.Student.StudentNumber,
                p.AmountPaid,
                p.Currency,
                p.PaymentMethod.Name,
                p.PaymentMethod.Code,
                p.PrepaymentDescription,
                p.PaymentDate,
                p.Receipt != null ? p.Receipt.ReceiptNumber : "—"))
            .ToListAsync();

        return new DashboardSummaryDto(
            totalStudents,   activeStudents,
            termName,        yearName,
            feesExpected,
            usdCollected,                               // USD collected only
            Math.Max(0m, feesExpected - usdCollected),  // outstanding in USD
            collectionRate,
            usdCash,
            cashCollectionRate,
            zigCollected,
            zigCash,
            usdPrepayment,   // prepayment estimated value (USD)
            prepaymentCount,
            todayIncomeUsd,
            todayIncomeZig,
            todayPrepayment,
            todayExpenses,
            todayIncomeUsd - todayExpenses,             // USD cash balance only
            todayPayments.Count,
            todayByMethod,
            studentsOwing,
            recent);
    }
}