using Microsoft.EntityFrameworkCore;
using SchoolPaymentSystem.Data;
using SchoolPaymentSystem.DTO.Reports;
using SchoolPaymentSystem.DTO.Splitter;
using SchoolPaymentSystem.Exceptions;
using SchoolPaymentSystem.Helpers;
using SchoolPaymentSystem.Models.payment;
using SchoolPaymentSystem.Services.Interfaces;

namespace SchoolPaymentSystem.Services;

public class ReportService : IReportService
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser         _currentUser;

    public ReportService(ApplicationDbContext db, ICurrentUser currentUser)
    {
        _db          = db;
        _currentUser = currentUser;
    }

    // ── Daily Report ──────────────────────────────────────────────────────────

    public async Task<DailyReportDto> GetDailyReportAsync(DailyReportRequest request)
    {
        var date = request.Date.Date;
        return await BuildReportAsync(date, date.AddDays(1).AddTicks(-1), request.AcademicYearId);
    }

    public async Task<DailyReportDto> GetRangeReportAsync(DateRangeReportRequest request) =>
        await BuildReportAsync(request.From, request.To, request.AcademicYearId);

    private async Task<DailyReportDto> BuildReportAsync(
        DateTime from, DateTime to, int? academicYearId)
    {
        // ── Income ────────────────────────────────────────────────────────────
        var paymentsQuery = _db.Payment.AsNoTracking()
            .Include(p => p.PaymentMethod)
            .Where(p => p.PaymentDate >= from
                     && p.PaymentDate <= to
                     && p.Status == PaymentStatus.Completed);

        if (academicYearId.HasValue)
            paymentsQuery = paymentsQuery.Where(p => p.AcademicYearId == academicYearId.Value);

        var payments = await paymentsQuery
            .Include(p => p.Student).ThenInclude(s => s.GradeHistories).ThenInclude(gh => gh.Grade)
            .Include(p => p.Term)
            .Include(p => p.Receipt)
            .Include(p => p.RecordedBy)
            .ToListAsync();

        var incomeByMethod = payments
            .GroupBy(p => new { p.PaymentMethod.Name, p.PaymentMethod.Code, p.Currency })
            .Select(g => new IncomeByMethodDto(
                g.Key.Name,
                g.Key.Code,
                g.Key.Currency,
                g.Sum(p => p.AmountPaid),
                g.Count(),
                g.Key.Code == "PREPAYMENT",
                TotalUsd: g.Key.Code == "PREPAYMENT" ? 0m : g.Sum(p => p.AmountUsd)))
            .OrderBy(x => x.IsPrepayment)   // cash methods first
            .ThenBy(x => x.PaymentMethodName)
            .ToList();

        // ── Expenses ──────────────────────────────────────────────────────────
        var expensesQuery = _db.Expense.AsNoTracking()
            .Include(e => e.ExpenseCategory)
            .Where(e => e.ExpenseDate >= from && e.ExpenseDate <= to);

        if (academicYearId.HasValue)
            expensesQuery = expensesQuery.Where(e => e.AcademicYearId == academicYearId.Value);

        var expenses = await expensesQuery
            .Include(e => e.PaymentMethod)
            .Include(e => e.RecordedBy)
            .ToListAsync();

        var expensesByCategory = expenses
            .GroupBy(e => new { e.ExpenseCategory.Name, e.Currency })
            .Select(g => new ExpensesByCategoryDto(
                g.Key.Name,
                g.Key.Currency,
                g.Sum(e => e.Amount),
                TotalUsd: g.Sum(e => e.AmountUsd),
                g.Count()))
            .OrderBy(x => x.CategoryName)
            .ToList();

        // ── Totals — USD and ZiG always kept separate, AmountUsd used for all math ──
        decimal cashIncomeUsd      = incomeByMethod
            .Where(x => !x.IsPrepayment && x.Currency == "USD").Sum(x => x.Total);
        decimal cashIncomeZig      = incomeByMethod
            .Where(x => !x.IsPrepayment && x.Currency == "ZIG").Sum(x => x.Total);
        decimal cashIncomeZigAsUsd = incomeByMethod
            .Where(x => !x.IsPrepayment && x.Currency == "ZIG").Sum(x => x.TotalUsd);
        decimal prepaymentTotal    = incomeByMethod
            .Where(x =>  x.IsPrepayment).Sum(x => x.Total);
        int     prepaymentCount    = incomeByMethod
            .Where(x =>  x.IsPrepayment).Sum(x => x.Count);

        decimal totalExpensesUsd      = expenses.Where(e => e.Currency == "USD").Sum(e => e.AmountUsd);
        decimal totalExpensesZig      = expenses.Where(e => e.Currency == "ZIG").Sum(e => e.Amount);
        decimal totalExpensesZigAsUsd = expenses.Where(e => e.Currency == "ZIG").Sum(e => e.AmountUsd);

        // True net balance: all income in USD terms minus all expenses in USD terms
        decimal balance =
            (cashIncomeUsd + cashIncomeZigAsUsd) - (totalExpensesUsd + totalExpensesZigAsUsd);

        // Build row-level detail for PDF
        var paymentLines = payments
            .OrderBy(p => p.PaymentDate)
            .Select(p => new PaymentLineItemDto(
                p.Id,
                $"{p.Student.FirstName} {p.Student.Surname}",
                p.Student.StudentNumber,
                p.Student.GradeHistories.OrderByDescending(gh => gh.AcademicYearId)
                    .FirstOrDefault()?.Grade?.Name ?? "—",
                p.Term?.Name ?? "—",
                p.PaymentMethod.Name,
                p.PaymentMethod.Code,
                p.Currency,
                p.AmountPaid,
                p.AmountUsd,
                p.ZigRateUsed,
                p.PaymentMethod.Code == "PREPAYMENT",
                p.PrepaymentDescription,
                p.Reference,
                p.PaymentDate,
                $"{p.RecordedBy?.FirstName ?? "—"} {p.RecordedBy?.LastName ?? ""}",
                p.Receipt?.ReceiptNumber ?? "—"))
            .ToList();

        var expenseLines = expenses
            .OrderBy(e => e.ExpenseDate)
            .Select(e => new ExpenseLineItemDto(
                e.Id,
                e.ExpenseCategory.Name,
                e.Description ?? "",
                e.Currency,
                e.Amount,
                e.AmountUsd,
                e.ZigRateUsed,
                e.PaymentMethod?.Name,
                e.ExpenseDate,
                $"{e.RecordedBy?.FirstName ?? "—"} {e.RecordedBy?.LastName ?? ""}"))
            .ToList();

        // ── Fee-type breakdown — query PaymentBreakdown rows for this period ──
        var paymentIds = payments.Select(p => p.Id).ToList();

        var feeTypeBreakdown = new List<FeeTypeBreakdownDto>();
        if (paymentIds.Any())
        {
            var breakdownRows = await _db.PaymentBreakdown.AsNoTracking()
                .Include(pb => pb.Payment)
                .Where(pb => paymentIds.Contains(pb.PaymentId)
                          && pb.AmountPaid > 0)
                .ToListAsync();

            // Human-readable labels for each item type
            static string FeeLabel(string feeType) => feeType switch
            {
                "Tuition"          => "Tuition Fee",
                "SportsLevy"       => "Sports Levy",
                "CustomFee"        => "Custom Fee",
                "RegistrationFee"  => "Registration Fee",
                "ReportBook"       => "Report Book",
                "AdmissionFee"     => "Admission Fee",
                "Uniform"          => "Uniform",
                "Transport"        => "Transport Fee",
                "Trip"             => "Trip Payment",
                "ProjectFee"       => "Project Fee",
                _                  => feeType
            };

            feeTypeBreakdown = breakdownRows
                .GroupBy(pb => new { FeeType = pb.ItemType.ToString(), pb.Payment.Currency })
                .Select(g => new FeeTypeBreakdownDto(
                    FeeType:  g.Key.FeeType,
                    Label:    FeeLabel(g.Key.FeeType),
                    Currency: g.Key.Currency,
                    // PaymentBreakdown.AmountPaid is ALWAYS stored in USD — the orchestrator
                    // converts ZIG → USD before allocating, so every breakdown line is USD.
                    // For the ZIG Collected column we back-convert using the stored rate.
                    Total: g.Key.Currency == "ZIG"
                        ? g.Sum(pb => pb.Payment.ZigRateUsed.HasValue
                            ? Math.Round(pb.AmountPaid * pb.Payment.ZigRateUsed.Value, 2)
                            : pb.AmountPaid)
                        : g.Sum(pb => pb.AmountPaid),
                    // TotalUsd is simply the sum of breakdown amounts — they are already USD.
                    TotalUsd: g.Sum(pb => pb.AmountPaid),
                    Count:    g.Count()))
                .OrderBy(x => x.FeeType)
                .ThenBy(x => x.Currency)
                .ToList();
        }

        // ── Resolve report generator identity ─────────────────────────────────
        var generatorUser = await _db.Users
            .Where(u => u.Id == _currentUser.UserId)
            .Select(u => new { u.FirstName, u.LastName, u.SignatureImageBase64 })
            .FirstOrDefaultAsync();

        string  generatedByName      = generatorUser is not null
            ? $"{generatorUser.FirstName} {generatorUser.LastName}"
            : "Unknown";
        string? generatedBySignature = generatorUser?.SignatureImageBase64;

        return new DailyReportDto(
            from.Date,
            incomeByMethod,
            cashIncomeUsd,
            cashIncomeZig,
            cashIncomeZigAsUsd,
            prepaymentTotal,
            prepaymentCount,
            expensesByCategory,
            totalExpensesUsd,
            totalExpensesZig,
            totalExpensesZigAsUsd,
            Balance:               balance,
            PaymentCount:          payments.Count,
            ExpenseCount:          expenses.Count,
            PaymentLines:          paymentLines,
            ExpenseLines:          expenseLines,
            FeeTypeBreakdown:      feeTypeBreakdown,
            GeneratedByName:       generatedByName,
            GeneratedBySignature:  generatedBySignature);
    }

    // ── Arrears Report ────────────────────────────────────────────────────────

    public async Task<ArrearsReportDto> GetArrearsReportAsync(ArrearsReportRequest request)
    {
        var academicYear = await _db.AcademicYear.AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == request.AcademicYearId)
            ?? throw new NotFoundException("AcademicYear", request.AcademicYearId);

        var term = await _db.Term.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == request.TermId)
            ?? throw new NotFoundException("Term", request.TermId);

        var termMonths = await _db.TermMonth.AsNoTracking()
            .Where(m => m.TermId == request.TermId)
            .OrderBy(m => m.SortOrder)
            .ToListAsync();

        // Students in scope
        var historyQuery = _db.StudentGradeHistory.AsNoTracking()
            .Include(h => h.Student)
            .Include(h => h.Grade)
            .Where(h => h.AcademicYearId == request.AcademicYearId && h.IsActive && !h.IsGraduated);

        if (request.GradeId.HasValue)
            historyQuery = historyQuery.Where(h => h.GradeId == request.GradeId.Value);

        var histories = await historyQuery.ToListAsync();

        var studentIds = histories.Select(h => h.StudentId).ToList();

        // Load all completed breakdowns for these students in this term
        var allBreakdowns = await _db.PaymentBreakdown.AsNoTracking()
            .Include(pb => pb.Payment)
            .Where(pb => studentIds.Contains(pb.Payment.StudentId)
                      && pb.Payment.TermId         == request.TermId
                      && pb.Payment.AcademicYearId == request.AcademicYearId
                      && pb.Payment.Status         == PaymentStatus.Completed
                      && pb.ItemType               == PaymentItemType.Tuition
                      && pb.TermMonthId            != null)
            .ToListAsync();

        var studentRows = new List<StudentArrearsDto>();

        foreach (var history in histories)
        {
            var termFee = await _db.TermFee.AsNoTracking()
                .Where(f => f.TermId == request.TermId && f.GradeId == history.GradeId)
                .Select(f => f.TuitionAmount)
                .FirstOrDefaultAsync();

            var studentBreakdowns = allBreakdowns
                .Where(pb => pb.Payment.StudentId == history.StudentId)
                .Select(pb => new ExistingAllocation(pb.TermMonthId!.Value, pb.AmountPaid))
                .ToList();

            // Load overrides for this student so arrears reflect custom rates
            var studentOverrides = await _db.StudentFeeOverride.AsNoTracking()
                .Where(o => o.StudentId == history.StudentId &&
                            o.AcademicYearId == request.AcademicYearId &&
                            o.IsActive)
                .ToListAsync();

            // Build per-month dues respecting overrides
            Dictionary<int, decimal>? monthDues = null;
            if (studentOverrides.Count > 0)
            {
                monthDues = new Dictionary<int, decimal>();
                for (int i = 0; i < termMonths.Count; i++)
                {
                    var m = termMonths[i];
                    var ov = studentOverrides.FirstOrDefault(o => o.TermMonthId == m.Id);
                    decimal flatMonthly = termMonths.Count > 0 ? Math.Round(termFee / termMonths.Count, 2) : 0m;
                    decimal flatLast    = termFee - flatMonthly * (termMonths.Count - 1);
                    if (ov?.OverrideTuitionAmount.HasValue == true)
                        monthDues[m.Id] = ov.OverrideTuitionAmount!.Value;
                    else
                        monthDues[m.Id] = i == termMonths.Count - 1 ? flatLast : flatMonthly;
                }
            }

            var balance = PaymentSplitter.ComputeBalance(
                termMonths, termFee, studentBreakdowns,
                startingTermMonthId: history.StartingTermMonthId,
                monthDues: monthDues);

            studentRows.Add(new StudentArrearsDto(
                history.StudentId,
                history.Student.StudentNumber,
                $"{history.Student.FirstName} {history.Student.Surname}",
                history.Grade.Name,
                balance.TotalDue,
                balance.TotalPaid,
                balance.TotalOwing));
        }

        var owing = studentRows.Where(r => r.TotalOwing > 0).ToList();

        return new ArrearsReportDto(
            academicYear.Name,
            term.Name,
            request.GradeId.HasValue
                ? (await _db.Grade.Where(g => g.Id == request.GradeId).Select(g => g.Name).FirstOrDefaultAsync())
                : null,
            TotalStudents: studentRows.Count,
            StudentsOwing: owing.Count,
            TotalFees:     studentRows.Sum(r => r.TotalDue),
            TotalPaid:     studentRows.Sum(r => r.TotalPaid),
            TotalOwing:    studentRows.Sum(r => r.TotalOwing),
            Students:      studentRows.OrderByDescending(r => r.TotalOwing).ToList());
    }

    // ── Transport payments report ─────────────────────────────────────────────
    public async Task<List<TransportPaymentRow>> GetTransportReportAsync(TransportReportRequest request)
    {
        var query = _db.TransportFeePayment.AsNoTracking()
            .Include(t => t.Payment).ThenInclude(p => p.Student)
                .ThenInclude(s => s.GradeHistories.OrderByDescending(h => h.AcademicYearId))
                    .ThenInclude(h => h.Grade)
            .Include(t => t.Payment).ThenInclude(p => p.PaymentMethod)
            .Include(t => t.Payment).ThenInclude(p => p.Receipt)
            .Include(t => t.TermMonth)
            .AsQueryable();

        if (request.TermId.HasValue)
        {
            var ids = await _db.TermMonth.AsNoTracking()
                .Where(m => m.TermId == request.TermId.Value).Select(m => m.Id).ToListAsync();
            query = query.Where(t => ids.Contains(t.TermMonthId));
        }

        query = query.Where(t => t.Payment.Status == PaymentStatus.Completed);
        if (request.From.HasValue) query = query.Where(t => t.PaidAt >= request.From.Value);
        if (request.To.HasValue)   query = query.Where(t => t.PaidAt <= request.To.Value.AddDays(1).AddTicks(-1));

        var rows = await query.ToListAsync();

        if (request.GradeId.HasValue)
            rows = rows.Where(t => t.Payment.Student.GradeHistories
                .Any(h => h.GradeId == request.GradeId.Value)).ToList();

        // Get transport fee settings for balance calculation
        var ayIds = rows.Select(r => r.Payment.AcademicYearId).Distinct().ToList();
        var transportSettings = await _db.TransportFeeSetting.AsNoTracking()
            .Where(t => ayIds.Contains(t.AcademicYearId))
            .ToDictionaryAsync(t => t.AcademicYearId, t => t.MonthlyAmount);

        return rows.Select(t => {
            var grade = t.Payment.Student.GradeHistories.FirstOrDefault()?.Grade?.Name ?? "—";
            decimal monthlyFee = transportSettings.GetValueOrDefault(t.Payment.AcademicYearId, t.AmountPaid);
            decimal balance = Math.Max(0m, monthlyFee - t.AmountPaid);
            return new TransportPaymentRow(
                t.Payment.StudentId,
                $"{t.Payment.Student.FirstName} {t.Payment.Student.Surname}",
                t.Payment.Student.StudentNumber,
                grade,
                t.TermMonth?.MonthName ?? "—",
                t.AmountPaid,
                monthlyFee,
                balance,
                t.Payment.Currency,
                t.PaidAt,
                t.Payment.PaymentMethod.Name,
                t.Payment.Receipt?.ReceiptNumber ?? "—",
                t.DaysEntitled,
                t.TotalSchoolDays,
                t.Notes);
        }).OrderBy(r => r.PaidAt).ToList();
    }

    // ── Trip payments report ──────────────────────────────────────────────────
    public async Task<List<TripPaymentRow>> GetTripReportAsync(TripReportRequest request)
    {
        var query = _db.TripPaymentRecord.AsNoTracking()
            .Include(t => t.Payment).ThenInclude(p => p.Student)
                .ThenInclude(s => s.GradeHistories.OrderByDescending(h => h.AcademicYearId))
                    .ThenInclude(h => h.Grade)
            .Include(t => t.Payment).ThenInclude(p => p.PaymentMethod)
            .Include(t => t.Payment).ThenInclude(p => p.Receipt)
            .Include(t => t.TripSetting)
            .Where(t => t.Payment.Status == PaymentStatus.Completed)
            .AsQueryable();

        if (request.TermId.HasValue)       query = query.Where(t => t.TripSetting.TermId == request.TermId.Value);
        if (request.TripSettingId.HasValue) query = query.Where(t => t.TripSettingId == request.TripSettingId.Value);
        if (request.From.HasValue)          query = query.Where(t => t.PaidAt >= request.From.Value);
        if (request.To.HasValue)            query = query.Where(t => t.PaidAt <= request.To.Value.AddDays(1).AddTicks(-1));

        var rows = await query.ToListAsync();

        if (request.GradeId.HasValue)
            rows = rows.Where(t => t.Payment.Student.GradeHistories
                .Any(h => h.GradeId == request.GradeId.Value)).ToList();

        return rows.Select(t => {
            var grade = t.Payment.Student.GradeHistories.FirstOrDefault()?.Grade?.Name ?? "—";
            return new TripPaymentRow(
                t.Payment.StudentId,
                $"{t.Payment.Student.FirstName} {t.Payment.Student.Surname}",
                t.Payment.Student.StudentNumber,
                grade, t.TripSetting.Name,
                t.AmountPaid, t.Payment.Currency,
                t.PaidAt, t.Payment.PaymentMethod.Name,
                t.Payment.Receipt?.ReceiptNumber ?? "—");
        }).OrderBy(r => r.PaidAt).ToList();
    }

    // ── Surplus transfer log report ───────────────────────────────────────────
    public async Task<List<TransferLogRow>> GetTransferLogAsync(DateTime? from, DateTime? to)
    {
        var query = _db.SurplusTransfer.AsNoTracking()
            .Include(s => s.Payment).ThenInclude(p => p.Student)
            .Include(s => s.Payment).ThenInclude(p => p.Receipt)
            .Include(s => s.TransferredBy)
            .AsQueryable();

        if (from.HasValue) query = query.Where(s => s.TransferredAt >= from.Value);
        if (to.HasValue)   query = query.Where(s => s.TransferredAt <= to.Value.AddDays(1).AddTicks(-1));

        var rows = await query.OrderByDescending(s => s.TransferredAt).ToListAsync();

        return rows.Select(s => new TransferLogRow(
            s.Id,
            s.StudentId,
            $"{s.Payment.Student.FirstName} {s.Payment.Student.Surname}",
            s.Payment.Student.StudentNumber,
            s.PaymentId,
            s.Payment.Receipt?.ReceiptNumber ?? "—",
            SourceFeeType:       s.SourceItemType?.ToString(),
            SourceLabel:         s.SourceItemType.HasValue
                                    ? FeeTypeLabel(s.SourceItemType.Value)
                                    : null,
            TargetFeeType:       s.TargetItemType.ToString(),
            TargetLabel:         FeeTypeLabel(s.TargetItemType),
            s.Amount,
            s.Reason,
            IsStandaloneTransfer: s.IsStandaloneTransfer,
            s.TransferredAt,
            $"{s.TransferredBy.FirstName} {s.TransferredBy.LastName}"
        )).ToList();
    }

    // ── Uniform Sales Report ──────────────────────────────────────────────────

    public async Task<List<UniformSalesRow>> GetUniformSalesAsync(UniformSalesRequest request)
    {
        var query = _db.UniformPurchaseLine.AsNoTracking()
            .Include(u => u.Payment).ThenInclude(p => p.Student)
                .ThenInclude(s => s.GradeHistories).ThenInclude(h => h.Grade)
            .Include(u => u.Payment).ThenInclude(p => p.Receipt)
            .Include(u => u.Payment).ThenInclude(p => p.RecordedBy)
            .Include(u => u.UniformItem)
            .AsQueryable();

        if (request.From.HasValue)
            query = query.Where(u => u.Payment.PaymentDate >= request.From.Value);
        if (request.To.HasValue)
            query = query.Where(u => u.Payment.PaymentDate <= request.To.Value.AddDays(1).AddTicks(-1));
        if (request.AcademicYearId.HasValue)
            query = query.Where(u => u.Payment.AcademicYearId == request.AcademicYearId.Value);
        if (request.GradeId.HasValue)
            query = query.Where(u => u.Payment.Student.GradeHistories
                .Any(h => h.GradeId == request.GradeId.Value
                       && h.AcademicYearId == request.AcademicYearId));

        var rows = await query
            .OrderByDescending(u => u.Payment.PaymentDate)
            .ToListAsync();

        return rows.Select(u => new UniformSalesRow(
            u.Id,
            u.Payment.StudentId,
            $"{u.Payment.Student.FirstName} {u.Payment.Student.Surname}",
            u.Payment.Student.StudentNumber,
            u.PaymentId,
            u.Payment.Receipt?.ReceiptNumber ?? "—",
            u.UniformItem.Name,
            u.Quantity,
            u.UnitPrice,
            u.TotalPrice,
            u.Payment.PaymentDate,
            $"{u.Payment.RecordedBy?.FirstName} {u.Payment.RecordedBy?.LastName}"
        )).ToList();
    }

    private static string FeeTypeLabel(SchoolPaymentSystem.Models.payment.PaymentItemType t) => t switch
    {
        SchoolPaymentSystem.Models.payment.PaymentItemType.Tuition         => "Tuition Fee",
        SchoolPaymentSystem.Models.payment.PaymentItemType.SportsLevy      => "Sports Levy",
        SchoolPaymentSystem.Models.payment.PaymentItemType.RegistrationFee => "Registration Fee (Exam)",
        SchoolPaymentSystem.Models.payment.PaymentItemType.ReportBook      => "Report Book",
        SchoolPaymentSystem.Models.payment.PaymentItemType.AdmissionFee    => "Admission Fee",
        SchoolPaymentSystem.Models.payment.PaymentItemType.Transport       => "Transport Fee",
        SchoolPaymentSystem.Models.payment.PaymentItemType.Trip            => "Trip Payment",
        SchoolPaymentSystem.Models.payment.PaymentItemType.ProjectFee      => "Project Fee",
        SchoolPaymentSystem.Models.payment.PaymentItemType.Uniform         => "Uniform",
        _                                                                   => t.ToString()
    };

    // ── Student Statement ─────────────────────────────────────────────────────

    public async Task<StudentStatementDto> GetStudentStatementAsync(int studentId, int? academicYearId)
    {
        var student = await _db.Student.AsNoTracking()
            .Include(s => s.GradeHistories).ThenInclude(h => h.Grade)
            .FirstOrDefaultAsync(s => s.Id == studentId)
            ?? throw new SchoolPaymentSystem.Exceptions.NotFoundException("Student", studentId);

        // Resolve grade name for requested year (or latest)
        var gradeHistory = academicYearId.HasValue
            ? student.GradeHistories.FirstOrDefault(h => h.AcademicYearId == academicYearId.Value)
            : student.GradeHistories.OrderByDescending(h => h.AcademicYearId).FirstOrDefault();

        var gradeName   = gradeHistory?.Grade?.Name ?? "—";
        var yearId      = gradeHistory?.AcademicYearId ?? academicYearId;

        var yearName    = yearId.HasValue
            ? (await _db.AcademicYear.AsNoTracking().FirstOrDefaultAsync(y => y.Id == yearId.Value))?.Name ?? "—"
            : "All Years";

        var paymentsQuery = _db.Payment.AsNoTracking()
            .AsSplitQuery()
            .Include(p => p.PaymentMethod)
            .Include(p => p.Term)
            .Include(p => p.RecordedBy)
            .Include(p => p.Receipt)
            .Include(p => p.Breakdowns).ThenInclude(b => b.TermMonth)
            .Include(p => p.UniformPurchaseLines).ThenInclude(u => u.UniformItem)
            .Where(p => p.StudentId == studentId && p.Status == SchoolPaymentSystem.Models.payment.PaymentStatus.Completed);

        if (yearId.HasValue)
            paymentsQuery = paymentsQuery.Where(p => p.AcademicYearId == yearId.Value);

        var payments = await paymentsQuery.OrderBy(p => p.PaymentDate).ToListAsync();

        decimal totalPaid = payments.Sum(p => p.AmountUsd);
        decimal totalDue  = 0m; // calculated from breakdowns
        if (payments.Any())
        {
            totalDue = payments.SelectMany(p => p.Breakdowns).Sum(b => b.AmountDue);
        }

        var rows = payments.Select(p => new StatementPaymentRow(
            p.Id,
            p.Receipt?.ReceiptNumber ?? "—",
            p.PaymentDate,
            p.PaymentMethod.Name,
            p.Currency,
            p.AmountPaid,
            p.AmountUsd,
            p.ZigRateUsed,
            p.Term.Name,
            $"{p.RecordedBy?.FirstName} {p.RecordedBy?.LastName}".Trim(),
            p.Status.ToString(),
            p.Breakdowns
                .OrderBy(b => b.TermMonth?.SortOrder ?? 0)
                .Select(b => new StatementBreakdownLine(
                    b.Label,
                    b.AmountDue,
                    b.AmountPaid,
                    b.MonthStatus.ToString()))
                .ToList(),
            p.UniformPurchaseLines
                .Select(u => new StatementUniformLine(
                    u.UniformItem.Name,
                    u.Quantity,
                    u.UnitPrice,
                    u.TotalPrice))
                .ToList()
        )).ToList();

        return new StudentStatementDto(
            student.Id,
            $"{student.FirstName} {student.Surname}",
            student.StudentNumber,
            gradeName,
            yearName,
            totalPaid,
            totalDue,
            totalDue - totalPaid,
            rows
        );
    }

    // ── Standalone Fees Report (Registration Fee & Project Fee) ──────────────

    public async Task<List<StandaloneFeeRow>> GetStandaloneFeesReportAsync(
        StandaloneFeesReportRequest request)
    {
        var rows = new List<StandaloneFeeRow>();

        if (request.FeeType == "registration" || request.FeeType == "all")
        {
            var regPayments = await _db.RegistrationFeePayment.AsNoTracking()
                .Where(r => r.AcademicYearId == request.AcademicYearId)
                .Include(r => r.Student)
                    .ThenInclude(s => s.GradeHistories.Where(h => h.AcademicYearId == request.AcademicYearId))
                        .ThenInclude(h => h.Grade)
                .Include(r => r.Payment)
                    .ThenInclude(p => p.PaymentMethod)
                .Include(r => r.Payment)
                    .ThenInclude(p => p.Receipt)
                .ToListAsync();

            // Get configured fee amount
            var regSetting = await _db.RegistrationFeeSetting.AsNoTracking()
                .FirstOrDefaultAsync(r => r.AcademicYearId == request.AcademicYearId);
            decimal regFee = regSetting?.Amount ?? 0m;

            // Group by student — show one aggregated row per student
            foreach (var group in regPayments.GroupBy(r => r.StudentId))
            {
                var first = group.First();
                var grade = first.Student.GradeHistories.FirstOrDefault()?.Grade;
                decimal totalPaid = group.Sum(r => r.AmountPaid);
                decimal feeDue = regFee; // Grade 7 may owe 2x; this is per-payment record already split
                decimal balance = Math.Max(0m, feeDue - totalPaid);
                var receipts = group
                    .Select(r => r.Payment.Receipt?.ReceiptNumber ?? "—")
                    .Distinct()
                    .Where(r => r != "—")
                    .ToList();
                var lastPayment = group.OrderByDescending(r => r.PaidAt).First();

                rows.Add(new StandaloneFeeRow(
                    first.StudentId,
                    $"{first.Student.FirstName} {first.Student.Surname}",
                    first.Student.StudentNumber,
                    grade?.Name ?? "—",
                    "Registration Fee",
                    totalPaid,
                    feeDue,
                    balance,
                    lastPayment.Payment.Currency,
                    lastPayment.PaidAt,
                    lastPayment.Payment.PaymentMethod.Name,
                    string.Join(", ", receipts)
                ));
            }
        }

        if (request.FeeType == "project" || request.FeeType == "all")
        {
            var projPayments = await _db.ProjectFeePayment.AsNoTracking()
                .Where(p => p.AcademicYearId == request.AcademicYearId)
                .Include(p => p.Student)
                    .ThenInclude(s => s.GradeHistories.Where(h => h.AcademicYearId == request.AcademicYearId))
                        .ThenInclude(h => h.Grade)
                .Include(p => p.Payment)
                    .ThenInclude(pay => pay.PaymentMethod)
                .Include(p => p.Payment)
                    .ThenInclude(pay => pay.Receipt)
                .ToListAsync();

            var projSetting = await _db.ProjectFeeSetting.AsNoTracking()
                .FirstOrDefaultAsync(p => p.AcademicYearId == request.AcademicYearId);
            decimal projFee = projSetting?.Amount ?? 0m;

            // Group by student — show one aggregated row with total paid
            foreach (var group in projPayments.GroupBy(p => p.StudentId))
            {
                var first = group.First();
                var grade = first.Student.GradeHistories.FirstOrDefault()?.Grade;
                decimal totalPaid = group.Sum(p => p.AmountPaid);
                decimal balance = Math.Max(0m, projFee - totalPaid);
                var receipts = group
                    .Select(p => p.Payment.Receipt?.ReceiptNumber ?? "—")
                    .Distinct()
                    .Where(r => r != "—")
                    .ToList();
                var lastPayment = group.OrderByDescending(p => p.PaidAt).First();

                rows.Add(new StandaloneFeeRow(
                    first.StudentId,
                    $"{first.Student.FirstName} {first.Student.Surname}",
                    first.Student.StudentNumber,
                    grade?.Name ?? "—",
                    "Project Fee",
                    totalPaid,
                    projFee,
                    balance,
                    lastPayment.Payment.Currency,
                    lastPayment.PaidAt,
                    lastPayment.Payment.PaymentMethod.Name,
                    string.Join(", ", receipts)
                ));
            }
        }

        return rows.OrderBy(r => r.FeeType).ThenBy(r => r.StudentName).ToList();
    }
}