using Microsoft.EntityFrameworkCore;
using SchoolPaymentSystem.Data;
using SchoolPaymentSystem.DTO.Fees;
using SchoolPaymentSystem.DTO.Grade;
using SchoolPaymentSystem.Exceptions;
using SchoolPaymentSystem.Helpers;
using SchoolPaymentSystem.Models.grade;
using SchoolPaymentSystem.Models.term;
using SchoolPaymentSystem.Services.Interfaces;

namespace SchoolPaymentSystem.Services;

public class AcademicService : IAcademicService
{
    private readonly ApplicationDbContext _db;
    private readonly IAuditService _audit;

    public AcademicService(ApplicationDbContext db, IAuditService audit)
    {
        _db    = db;
        _audit = audit;
    }

    // ── Grades ────────────────────────────────────────────────────────────────

    public async Task<GradeDto> CreateGradeAsync(CreateGradeRequest request)
    {
        if (await _db.Grade.AnyAsync(g => g.Level == request.Level))
            throw new ConflictException($"A grade with level {request.Level} already exists.");

        var grade = new Grade { Name = request.Name, Level = request.Level, Description = request.Description };
        _db.Grade.Add(grade);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("CREATE_GRADE", "Grade", grade.Id.ToString(), newValues: grade);
        return ToDto(grade);
    }

    public async Task<GradeDto> UpdateGradeAsync(int id, UpdateGradeRequest request)
    {
        var grade = await _db.Grade.FindAsync(id)
                    ?? throw new NotFoundException("Grade", id);
        var old = new { grade.Name, grade.IsActive };
        grade.Name = request.Name; grade.Description = request.Description; grade.IsActive = request.IsActive;
        await _db.SaveChangesAsync();
        await _audit.LogAsync("UPDATE_GRADE", "Grade", id.ToString(), old, new { grade.Name, grade.IsActive });
        return ToDto(grade);
    }

    public async Task<List<GradeDto>> GetAllGradesAsync() =>
        await _db.Grade.AsNoTracking().OrderBy(g => g.Level)
            .Select(g => ToDto(g)).ToListAsync();

    // ── Academic Years ────────────────────────────────────────────────────────

    public async Task<AcademicYearDto> CreateAcademicYearAsync(CreateAcademicYearRequest request)
    {
        if (await _db.AcademicYear.AnyAsync(a => a.Year == request.Year))
            throw new ConflictException($"Academic year {request.Year} already exists.");

        var year = new AcademicYear { Year = request.Year, Name = request.Name };
        _db.AcademicYear.Add(year);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("CREATE_ACADEMIC_YEAR", "AcademicYear", year.Id.ToString(), newValues: year);
        return ToDto(year);
    }

    public async Task SetActiveYearAsync(int id)
    {
        await _db.AcademicYear.ExecuteUpdateAsync(s => s.SetProperty(a => a.IsActive, false));
        var year = await _db.AcademicYear.FindAsync(id) ?? throw new NotFoundException("AcademicYear", id);
        year.IsActive = true;
        await _db.SaveChangesAsync();
        await _audit.LogAsync("SET_ACTIVE_YEAR", "AcademicYear", id.ToString());
    }

    public async Task<AcademicYearDto> GetActiveYearAsync()
    {
        var year = await _db.AcademicYear.AsNoTracking().FirstOrDefaultAsync(a => a.IsActive)
                   ?? throw new NotFoundException("No active academic year is configured.");
        return ToDto(year);
    }

    public async Task<List<AcademicYearDto>> GetAllYearsAsync() =>
        await _db.AcademicYear.AsNoTracking().OrderByDescending(a => a.Year)
            .Select(a => ToDto(a)).ToListAsync();

    // ── Terms ─────────────────────────────────────────────────────────────────

    public async Task<TermDto> CreateTermAsync(CreateTermRequest request)
    {
        if (!await _db.AcademicYear.AnyAsync(a => a.Id == request.AcademicYearId))
            throw new NotFoundException("AcademicYear", request.AcademicYearId);

        if (await _db.Term.AnyAsync(t => t.AcademicYearId == request.AcademicYearId
                                      && t.TermNumber == request.TermNumber))
            throw new ConflictException($"Term {request.TermNumber} already exists for this academic year.");

        var term = new Term
        {
            AcademicYearId = request.AcademicYearId,
            TermNumber     = request.TermNumber,
            Name           = request.Name,
            StartDate      = request.StartDate,
            EndDate        = request.EndDate,
            TermMonths     = request.MonthNumbers
                .Select((m, i) => new TermMonth
                {
                    MonthNumber = m,
                    MonthName   = DateHelper.MonthName(m),
                    SortOrder   = i
                }).ToList()
        };

        _db.Term.Add(term);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("CREATE_TERM", "Term", term.Id.ToString(), newValues: new { term.Name, term.TermNumber });
        return await GetTermDtoAsync(term.Id);
    }

    public async Task<TermDto> UpdateTermAsync(int id, UpdateTermRequest request)
    {
        var term = await _db.Term.FindAsync(id) ?? throw new NotFoundException("Term", id);
        term.Name      = request.Name;
        term.StartDate = request.StartDate;
        term.EndDate   = request.EndDate;
        term.IsActive  = request.IsActive;
        await _db.SaveChangesAsync();
        await _audit.LogAsync("UPDATE_TERM", "Term", id.ToString());
        return await GetTermDtoAsync(id);
    }

    public async Task SetActiveTermAsync(int id)
    {
        var term = await _db.Term.FindAsync(id) ?? throw new NotFoundException("Term", id);
        await _db.Term.Where(t => t.AcademicYearId == term.AcademicYearId)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.IsActive, false));
        term.IsActive = true;
        await _db.SaveChangesAsync();
        await _audit.LogAsync("SET_ACTIVE_TERM", "Term", id.ToString());
    }

    public async Task<TermDto> GetActiveTermAsync()
    {
        var term = await _db.Term.AsNoTracking()
            .Include(t => t.AcademicYear)
            .Include(t => t.TermMonths)
            .FirstOrDefaultAsync(t => t.IsActive)
            ?? throw new NotFoundException("No active term is configured.");
        return MapTermDto(term);
    }

    public async Task<List<TermDto>> GetTermsByYearAsync(int academicYearId) =>
        await _db.Term.AsNoTracking()
            .Include(t => t.AcademicYear)
            .Include(t => t.TermMonths)
            .Where(t => t.AcademicYearId == academicYearId)
            .OrderBy(t => t.TermNumber)
            .Select(t => MapTermDto(t))
            .ToListAsync();

    // ── Term Fees ─────────────────────────────────────────────────────────────

    public async Task<TermFeeDto> SetTermFeeAsync(SetTermFeeRequest request)
    {
        var existing = await _db.TermFee
            .FirstOrDefaultAsync(f => f.TermId == request.TermId && f.GradeId == request.GradeId);

        if (existing is null)
        {
            existing = new TermFee { TermId = request.TermId, GradeId = request.GradeId };
            _db.TermFee.Add(existing);
        }

        existing.TuitionAmount              = request.TuitionAmount;
        existing.SportsLevyAmount           = request.SportsLevyAmount;
        existing.StaffChildTuitionAmount    = request.StaffChildTuitionAmount;
        existing.StaffChildSportsLevyAmount = request.StaffChildSportsLevyAmount;
        await _db.SaveChangesAsync();
        await _audit.LogAsync("SET_TERM_FEE", "TermFee", existing.Id.ToString(), newValues: request);

        return await GetTermFeeDtoAsync(existing.Id);
    }

    // ── Per-month tuition overrides ───────────────────────────────────────────

    public async Task<TermFeeDto> SetTermMonthFeeAsync(SetTermMonthFeeRequest request)
    {
        // Validate the TermFee and TermMonth both exist and belong to the same term
        var termFee = await _db.TermFee
            .FirstOrDefaultAsync(f => f.Id == request.TermFeeId)
            ?? throw new NotFoundException($"TermFee {request.TermFeeId} not found.");

        var termMonth = await _db.TermMonth
            .FirstOrDefaultAsync(m => m.Id == request.TermMonthId && m.TermId == termFee.TermId)
            ?? throw new NotFoundException($"TermMonth {request.TermMonthId} does not belong to this term.");

        var existing = await _db.TermMonthFee
            .FirstOrDefaultAsync(mf => mf.TermFeeId == request.TermFeeId
                                    && mf.TermMonthId == request.TermMonthId);

        if (existing is null)
        {
            existing = new TermMonthFee
            {
                TermFeeId   = request.TermFeeId,
                TermMonthId = request.TermMonthId,
            };
            _db.TermMonthFee.Add(existing);
        }

        existing.OverrideAmount = request.OverrideAmount;
        await _db.SaveChangesAsync();
        await _audit.LogAsync("SET_TERM_MONTH_FEE", "TermMonthFee", existing.Id.ToString(), newValues: request);

        return await GetTermFeeDtoAsync(request.TermFeeId);
    }

    public async Task<TermFeeDto> DeleteTermMonthFeeAsync(int termFeeId, int termMonthId)
    {
        var existing = await _db.TermMonthFee
            .FirstOrDefaultAsync(mf => mf.TermFeeId == termFeeId && mf.TermMonthId == termMonthId)
            ?? throw new NotFoundException($"No month fee override found for TermFee {termFeeId}, Month {termMonthId}.");

        _db.TermMonthFee.Remove(existing);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("DELETE_TERM_MONTH_FEE", "TermMonthFee", existing.Id.ToString());

        return await GetTermFeeDtoAsync(termFeeId);
    }

    public async Task<List<TermFeeDto>> GetTermFeesAsync(int termId)
    {
        // Load all term months for this term (for default split calculation)
        var termMonths = await _db.TermMonth.AsNoTracking()
            .Where(m => m.TermId == termId)
            .OrderBy(m => m.SortOrder)
            .ToListAsync();

        var fees = await _db.TermFee.AsNoTracking()
            .Include(f => f.Term).Include(f => f.Grade)
            .Include(f => f.MonthFees)
            .Where(f => f.TermId == termId)
            .ToListAsync();

        return fees.Select(f =>
        {
            var monthCount  = termMonths.Count;
            var defaultSplit = monthCount > 0
                ? Math.Round(f.TuitionAmount / monthCount, 2)
                : 0m;

            // Build a full month list: one entry per term month
            // Use override amount if one exists, otherwise use the even split
            var overrideMap = f.MonthFees.ToDictionary(mf => mf.TermMonthId, mf => mf.OverrideAmount);

            var allMonthFees = termMonths.Select(m => new TermMonthFeeInfo(
                overrideMap.ContainsKey(m.Id) ? f.MonthFees.First(mf => mf.TermMonthId == m.Id).Id : 0,
                m.Id,
                m.MonthName,
                overrideMap.TryGetValue(m.Id, out var ov) ? ov : defaultSplit
            )).ToList();

            return new TermFeeDto(
                f.Id, f.TermId, f.Term.Name, f.GradeId, f.Grade.Name,
                f.TuitionAmount, f.SportsLevyAmount,
                f.StaffChildTuitionAmount, f.StaffChildSportsLevyAmount,
                allMonthFees
            );
        }).ToList();
    }

    public async Task<decimal> GetTermFeeForStudentAsync(int studentId, int termId, int academicYearId)
    {
        var gradeHistory = await _db.StudentGradeHistory.AsNoTracking()
            .FirstOrDefaultAsync(h => h.StudentId == studentId && h.AcademicYearId == academicYearId)
            ?? throw new NotFoundException($"No grade history for student {studentId} in this academic year.");

        var fee = await _db.TermFee.AsNoTracking()
            .FirstOrDefaultAsync(f => f.TermId == termId && f.GradeId == gradeHistory.GradeId)
            ?? throw new NotFoundException($"No fee configured for this term and grade.");

        // If the student joined mid-term, calculate the prorated fee (only months from enrollment onward)
        if (gradeHistory.StartingTermMonthId.HasValue)
        {
            var termMonths = await _db.TermMonth.AsNoTracking()
                .Where(m => m.TermId == termId)
                .OrderBy(m => m.SortOrder)
                .ToListAsync();

            if (termMonths.Count == 0) return fee.TuitionAmount;

            var monthlyFee = Math.Round(fee.TuitionAmount / termMonths.Count, 2);
            var liableMonths = termMonths
                .SkipWhile(m => m.Id != gradeHistory.StartingTermMonthId.Value)
                .ToList();

            if (liableMonths.Count == 0) return fee.TuitionAmount;

            // Last month of the full term absorbs rounding — respect that
            decimal lastMonthFee = fee.TuitionAmount - monthlyFee * (termMonths.Count - 1);
            bool includesLastMonth = liableMonths.Last().Id == termMonths.Last().Id;

            decimal prorated = monthlyFee * (liableMonths.Count - (includesLastMonth ? 1 : 0))
                             + (includesLastMonth ? lastMonthFee : monthlyFee);

            return Math.Round(prorated, 2);
        }

        return fee.TuitionAmount;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<TermDto> GetTermDtoAsync(int id)
    {
        var term = await _db.Term.AsNoTracking()
            .Include(t => t.AcademicYear).Include(t => t.TermMonths)
            .FirstAsync(t => t.Id == id);
        return MapTermDto(term);
    }

    private async Task<TermFeeDto> GetTermFeeDtoAsync(int id)
    {
        var f = await _db.TermFee.AsNoTracking()
            .Include(x => x.Term).Include(x => x.Grade)
            .Include(x => x.MonthFees)
            .FirstAsync(x => x.Id == id);

        var termMonths = await _db.TermMonth.AsNoTracking()
            .Where(m => m.TermId == f.TermId)
            .OrderBy(m => m.SortOrder)
            .ToListAsync();

        var monthCount   = termMonths.Count;
        var defaultSplit = monthCount > 0 ? Math.Round(f.TuitionAmount / monthCount, 2) : 0m;
        var overrideMap  = f.MonthFees.ToDictionary(mf => mf.TermMonthId, mf => mf);

        var allMonthFees = termMonths.Select(m =>
        {
            overrideMap.TryGetValue(m.Id, out var ov);
            return new TermMonthFeeInfo(
                ov?.Id ?? 0,
                m.Id,
                m.MonthName,
                ov?.OverrideAmount ?? defaultSplit
            );
        }).ToList();

        return new TermFeeDto(
            f.Id, f.TermId, f.Term.Name, f.GradeId, f.Grade.Name,
            f.TuitionAmount, f.SportsLevyAmount,
            f.StaffChildTuitionAmount, f.StaffChildSportsLevyAmount,
            allMonthFees);
    }

    // ── Term Extension Months ─────────────────────────────────────────────────

    public async Task<List<TermExtensionMonthDto>> GetExtensionMonthsAsync(int termId) =>
        await _db.TermExtensionMonth.AsNoTracking()
            .Include(em => em.ExtensionFees).ThenInclude(ef => ef.Grade)
            .Where(em => em.TermId == termId)
            .OrderBy(em => em.MonthNumber)
            .Select(em => MapExtensionDto(em))
            .ToListAsync();

    public async Task<TermExtensionMonthDto> AddExtensionMonthAsync(AddTermExtensionMonthRequest request)
    {
        if (!await _db.Term.AnyAsync(t => t.Id == request.TermId))
            throw new NotFoundException("Term", request.TermId);

        // Prevent duplicating a month that is already in the term's regular months
        bool inRegular = await _db.TermMonth.AnyAsync(m => m.TermId == request.TermId
                                                         && m.MonthNumber == request.MonthNumber);
        if (inRegular)
            throw new ConflictException($"Month {request.MonthNumber} is already a regular month of this term.");

        if (await _db.TermExtensionMonth.AnyAsync(em => em.TermId == request.TermId
                                                       && em.MonthNumber == request.MonthNumber))
            throw new ConflictException($"An extension month for month {request.MonthNumber} already exists on this term.");

        var em = new TermExtensionMonth
        {
            TermId      = request.TermId,
            MonthNumber = request.MonthNumber,
            MonthName   = DateHelper.MonthName(request.MonthNumber),
        };
        _db.TermExtensionMonth.Add(em);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("ADD_EXTENSION_MONTH", "TermExtensionMonth", em.Id.ToString(), newValues: request);
        return await GetExtensionMonthDtoAsync(em.Id);
    }

    public async Task RemoveExtensionMonthAsync(int extensionMonthId)
    {
        var em = await _db.TermExtensionMonth.FindAsync(extensionMonthId)
                 ?? throw new NotFoundException("TermExtensionMonth", extensionMonthId);
        _db.TermExtensionMonth.Remove(em);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("REMOVE_EXTENSION_MONTH", "TermExtensionMonth", extensionMonthId.ToString());
    }

    public async Task ToggleExtensionMonthAsync(int extensionMonthId, bool isActive)
    {
        var em = await _db.TermExtensionMonth.FindAsync(extensionMonthId)
                 ?? throw new NotFoundException("TermExtensionMonth", extensionMonthId);
        em.IsActive = isActive;
        await _db.SaveChangesAsync();
        await _audit.LogAsync("TOGGLE_EXTENSION_MONTH", "TermExtensionMonth", extensionMonthId.ToString());
    }

    public async Task<TermExtensionMonthDto> SetExtensionFeeAsync(SetExtensionFeeRequest request)
    {
        var em = await _db.TermExtensionMonth.FindAsync(request.TermExtensionMonthId)
                 ?? throw new NotFoundException("TermExtensionMonth", request.TermExtensionMonthId);

        if (!await _db.Grade.AnyAsync(g => g.Id == request.GradeId))
            throw new NotFoundException("Grade", request.GradeId);

        var existing = await _db.TermExtensionFee
            .FirstOrDefaultAsync(ef => ef.TermExtensionMonthId == request.TermExtensionMonthId
                                    && ef.GradeId == request.GradeId);
        if (existing is null)
        {
            existing = new TermExtensionFee
            {
                TermExtensionMonthId = request.TermExtensionMonthId,
                GradeId              = request.GradeId,
            };
            _db.TermExtensionFee.Add(existing);
        }

        existing.Amount = request.Amount;
        await _db.SaveChangesAsync();
        await _audit.LogAsync("SET_EXTENSION_FEE", "TermExtensionFee", existing.Id.ToString(), newValues: request);
        return await GetExtensionMonthDtoAsync(request.TermExtensionMonthId);
    }

    public async Task<TermExtensionMonthDto> RemoveExtensionFeeAsync(int extensionMonthId, int gradeId)
    {
        var ef = await _db.TermExtensionFee
            .FirstOrDefaultAsync(f => f.TermExtensionMonthId == extensionMonthId && f.GradeId == gradeId)
            ?? throw new NotFoundException($"No extension fee found for month {extensionMonthId}, grade {gradeId}.");
        _db.TermExtensionFee.Remove(ef);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("REMOVE_EXTENSION_FEE", "TermExtensionFee", ef.Id.ToString());
        return await GetExtensionMonthDtoAsync(extensionMonthId);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<TermExtensionMonthDto> GetExtensionMonthDtoAsync(int id)
    {
        var em = await _db.TermExtensionMonth.AsNoTracking()
            .Include(x => x.ExtensionFees).ThenInclude(ef => ef.Grade)
            .FirstAsync(x => x.Id == id);
        return MapExtensionDto(em);
    }

    private static TermExtensionMonthDto MapExtensionDto(TermExtensionMonth em) => new(
        em.Id, em.TermId, em.MonthNumber, em.MonthName, em.IsActive,
        em.ExtensionFees.Select(ef => new TermExtensionFeeDto(ef.Id, ef.GradeId, ef.Grade.Name, ef.Amount)).ToList()
    );

    private static GradeDto       ToDto(Grade g)        => new(g.Id, g.Name, g.Level, g.Description, g.IsActive);
    private static AcademicYearDto ToDto(AcademicYear a) => new(a.Id, a.Year, a.Name, a.IsActive, a.CreatedAt);

    private static TermDto MapTermDto(Term t) => new(
        t.Id, t.AcademicYearId, t.AcademicYear?.Name ?? string.Empty,
        t.TermNumber, t.Name, t.StartDate, t.EndDate, t.IsActive,
        t.TermMonths.OrderBy(m => m.SortOrder)
                    .Select(m => new TermMonthDto(m.Id, m.MonthNumber, m.MonthName, m.SortOrder))
                    .ToList());
}