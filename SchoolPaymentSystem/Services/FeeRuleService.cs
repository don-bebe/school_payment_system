using Microsoft.EntityFrameworkCore;
using SchoolPaymentSystem.Data;
using SchoolPaymentSystem.DTO.Fees;
using SchoolPaymentSystem.DTO.Student;
using SchoolPaymentSystem.Exceptions;
using SchoolPaymentSystem.Models.fees;
using SchoolPaymentSystem.Models.payment;
using SchoolPaymentSystem.Services.Interfaces;

namespace SchoolPaymentSystem.Services;

public class FeeRuleService : IFeeRuleService
{
    private readonly ApplicationDbContext _db;

    public FeeRuleService(ApplicationDbContext db) => _db = db;

    public async Task<bool> IsEffectiveStaffChildAsync(int studentId, int academicYearId)
    {
        var student = await _db.Student.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == studentId)
            ?? throw new NotFoundException("Student", studentId);

        if (student.IsStaffChild) return true;

        // Manual override: admin explicitly assigned discount to this student
        bool hasForceOverride = await _db.StudentFeeOverride.AnyAsync(o =>
            o.StudentId == studentId &&
            o.AcademicYearId == academicYearId &&
            o.IsActive &&
            o.ForceStaffChildRate &&
            o.TermMonthId == null);
        if (hasForceOverride) return true;

        if (!student.GuardianGroupId.HasValue) return false;
        return await IsSiblingRuleApplicableAsync(
            studentId, student.GuardianGroupId.Value, academicYearId);
    }

    public async Task<EffectiveFeeDto> GetEffectiveFeeAsync(
        int studentId, int termId, int academicYearId)
    {
        var student = await _db.Student.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == studentId)
            ?? throw new NotFoundException("Student", studentId);

        var gradeHistory = await _db.StudentGradeHistory.AsNoTracking()
            .FirstOrDefaultAsync(h => h.StudentId == studentId && h.AcademicYearId == academicYearId)
            ?? throw new BusinessRuleException(
                $"Student {studentId} has no grade assignment for academic year {academicYearId}.");

        var termFee = await _db.TermFee.AsNoTracking()
            .Include(tf => tf.MonthFees)
            .FirstOrDefaultAsync(f => f.TermId == termId && f.GradeId == gradeHistory.GradeId)
            ?? throw new BusinessRuleException(
                "No fee is configured for this term and grade. " +
                "Please configure the term fee before recording payments.");

        // Build a lookup: TermMonthId -> admin-configured per-month tuition amount
        var termMonthFeeMap = termFee.MonthFees
            .ToDictionary(mf => mf.TermMonthId, mf => mf.OverrideAmount);

        var termMonths = await _db.TermMonth.AsNoTracking()
            .Where(m => m.TermId == termId)
            .OrderBy(m => m.SortOrder)
            .ToListAsync();

        if (termMonths.Count == 0)
            throw new BusinessRuleException("This term has no months configured.");

        // Load all active overrides for this student/year
        var overrides = await _db.StudentFeeOverride.AsNoTracking()
            .Where(o => o.StudentId == studentId && o.AcademicYearId == academicYearId && o.IsActive)
            .ToListAsync();

        // Resolve staff-child status considering overrides
        bool isStaffChild = student.IsStaffChild
            || overrides.Any(o => o.ForceStaffChildRate && o.TermMonthId == null);
        if (!isStaffChild && student.GuardianGroupId.HasValue)
            isStaffChild = await IsSiblingRuleApplicableAsync(
                studentId, student.GuardianGroupId.Value, academicYearId);

        decimal baseTuition = isStaffChild && termFee.StaffChildTuitionAmount.HasValue
            ? termFee.StaffChildTuitionAmount.Value
            : termFee.TuitionAmount;

        decimal effectiveSportsLevy = isStaffChild && termFee.StaffChildSportsLevyAmount.HasValue
            ? termFee.StaffChildSportsLevyAmount.Value
            : termFee.SportsLevyAmount;

        int     monthCount = termMonths.Count;
        decimal monthly    = monthCount > 0 ? Math.Round(baseTuition / monthCount, 2) : 0m;
        decimal lastMonth  = monthCount > 0 ? baseTuition - monthly * (monthCount - 1) : 0m;

        var paidMap = await _db.PaymentBreakdown.AsNoTracking()
            .Include(pb => pb.Payment)
            .Where(pb => pb.Payment.StudentId     == studentId
                      && pb.Payment.TermId         == termId
                      && pb.Payment.AcademicYearId == academicYearId
                      && pb.Payment.Status         == PaymentStatus.Completed
                      && pb.ItemType               == PaymentItemType.Tuition
                      && pb.TermMonthId            != null)
            .GroupBy(pb => pb.TermMonthId!.Value)
            .Select(g => new { TermMonthId = g.Key, Paid = g.Sum(x => x.AmountPaid) })
            .ToDictionaryAsync(x => x.TermMonthId, x => x.Paid);

        // Only honour StartingTermMonthId when it belongs to THIS term's months.
        // If the student enrolled in a previous term, their starting month won't
        // exist in the current term's list — every month would be skipped (TuitionDue=0)
        // and the payment page would show no tuition items.
        var currentTermMonthIds = termMonths.Select(m => m.Id).ToHashSet();
        int? effectiveStartingMonthId = gradeHistory.StartingTermMonthId.HasValue
            && currentTermMonthIds.Contains(gradeHistory.StartingTermMonthId.Value)
                ? gradeHistory.StartingTermMonthId
                : null;

        var months = new List<TermMonthFeeDto>();
        bool reachedEnrollment = !effectiveStartingMonthId.HasValue;

        for (int i = 0; i < termMonths.Count; i++)
        {
            var month = termMonths[i];

            if (!reachedEnrollment)
            {
                if (month.Id == effectiveStartingMonthId!.Value)
                    reachedEnrollment = true;
                else
                {
                    months.Add(new TermMonthFeeDto(month.Id, month.MonthName, month.SortOrder, 0m, 0m, 0m));
                    continue;
                }
            }

            // Per-month override wins over everything else
            var monthOverride = overrides.FirstOrDefault(o => o.TermMonthId == month.Id);

            decimal due;
            if (monthOverride?.OverrideTuitionAmount.HasValue == true)
            {
                due = monthOverride.OverrideTuitionAmount!.Value;
            }
            else if (monthOverride?.ForceStaffChildRate == true && termFee.StaffChildTuitionAmount.HasValue)
            {
                decimal staffMonthly = Math.Round(termFee.StaffChildTuitionAmount.Value / monthCount, 2);
                due = (i == monthCount - 1)
                    ? termFee.StaffChildTuitionAmount.Value - staffMonthly * (monthCount - 1)
                    : staffMonthly;
            }
            else if (termMonthFeeMap.TryGetValue(month.Id, out var gradeMonthOverride))
            {
                // Admin configured a per-month tuition amount for this grade/term
                due = gradeMonthOverride;
            }
            else
            {
                due = (i == monthCount - 1) ? lastMonth : monthly;
            }

            decimal paid    = paidMap.GetValueOrDefault(month.Id, 0m);
            decimal balance = Math.Max(0m, due - paid);
            months.Add(new TermMonthFeeDto(month.Id, month.MonthName, month.SortOrder, due, paid, balance));
        }

        decimal effectiveTuition = months.Sum(m => m.TuitionDue);

        return new EffectiveFeeDto(
            TuitionAmount:    effectiveTuition,
            SportsLevyAmount: effectiveSportsLevy,
            IsStaffChildRate: isStaffChild,
            MonthlyTuition:   monthly,
            Months:           months);
    }

    // ── Fee Override CRUD ─────────────────────────────────────────────────────

    public async Task<StudentFeeOverride> UpsertFeeOverrideAsync(
        int studentId, int academicYearId, int? termMonthId,
        decimal? overrideTuitionAmount, bool forceStaffChildRate,
        string reason, string createdById)
    {
        var existing = await _db.StudentFeeOverride
            .Where(o => o.StudentId == studentId &&
                        o.AcademicYearId == academicYearId &&
                        o.TermMonthId == termMonthId &&
                        o.IsActive)
            .ToListAsync();
        foreach (var e in existing) e.IsActive = false;

        var newOverride = new StudentFeeOverride
        {
            StudentId             = studentId,
            AcademicYearId        = academicYearId,
            TermMonthId           = termMonthId,
            OverrideTuitionAmount = overrideTuitionAmount,
            ForceStaffChildRate   = forceStaffChildRate,
            Reason                = reason,
            IsActive              = true,
            CreatedAt             = DateTime.UtcNow,
            CreatedById           = createdById
        };
        _db.StudentFeeOverride.Add(newOverride);
        await _db.SaveChangesAsync();
        return newOverride;
    }

    public async Task<List<StudentFeeOverride>> GetFeeOverridesAsync(int studentId, int academicYearId) =>
        await _db.StudentFeeOverride.AsNoTracking()
            .Include(o => o.TermMonth)
            .Where(o => o.StudentId == studentId && o.AcademicYearId == academicYearId && o.IsActive)
            .OrderBy(o => o.TermMonthId)
            .ToListAsync();

    public async Task DeleteFeeOverrideAsync(int overrideId)
    {
        var o = await _db.StudentFeeOverride.FindAsync(overrideId)
                ?? throw new NotFoundException("StudentFeeOverride", overrideId);
        o.IsActive = false;
        await _db.SaveChangesAsync();
    }

    // ── Sibling rule ──────────────────────────────────────────────────────────

    private async Task<bool> IsSiblingRuleApplicableAsync(
        int studentId, int guardianGroupId, int academicYearId)
    {
        var siblings = await _db.StudentGradeHistory.AsNoTracking()
            .Include(h => h.Student)
            .Include(h => h.Grade)
            .Where(h => h.AcademicYearId == academicYearId
                     && h.Student.IsActive
                     && !h.IsGraduated
                     && h.Student.GuardianGroupId == guardianGroupId)
            .ToListAsync();

        if (siblings.Count < 3) return false;

        // Check if admin has manually reassigned which sibling gets the discount
        var siblingIds = siblings.Select(s => s.StudentId).ToList();
        var forcedStudentId = await _db.StudentFeeOverride.AsNoTracking()
            .Where(o => siblingIds.Contains(o.StudentId) &&
                        o.AcademicYearId == academicYearId &&
                        o.IsActive &&
                        o.ForceStaffChildRate &&
                        o.TermMonthId == null)
            .Select(o => (int?)o.StudentId)
            .FirstOrDefaultAsync();

        if (forcedStudentId.HasValue)
            return forcedStudentId.Value == studentId;

        // Default: highest-grade sibling gets the discount
        int maxLevel = siblings.Max(h => h.Grade.Level);
        var thisStudent = siblings.FirstOrDefault(h => h.StudentId == studentId);
        if (thisStudent is null) return false;
        return thisStudent.Grade.Level == maxLevel;
    }

    private static bool SiblingGetsDiscount(
        int studentId, List<(int StudentId, int GradeLevel)> group)
    {
        if (group.Count < 3) return false;
        int maxLevel = group.Max(s => s.GradeLevel);
        return group.Any(s => s.StudentId == studentId && s.GradeLevel == maxLevel);
    }

    public async Task<List<SiblingDto>> GetSiblingGroupAsync(int groupId, int academicYearId)
    {
        var histories = await _db.StudentGradeHistory.AsNoTracking()
            .Include(h => h.Student)
            .Include(h => h.Grade)
            .Where(h => h.AcademicYearId == academicYearId
                     && h.Student.IsActive
                     && !h.IsGraduated
                     && h.Student.GuardianGroupId == groupId)
            .OrderByDescending(h => h.Grade.Level)
            .ToListAsync();

        var groupFlat = histories.Select(h => (h.StudentId, GradeLevel: h.Grade.Level)).ToList();

        var siblingIds = histories.Select(h => h.StudentId).ToList();
        var forcedStudentId = await _db.StudentFeeOverride.AsNoTracking()
            .Where(o => siblingIds.Contains(o.StudentId) &&
                        o.AcademicYearId == academicYearId &&
                        o.IsActive &&
                        o.ForceStaffChildRate &&
                        o.TermMonthId == null)
            .Select(o => (int?)o.StudentId)
            .FirstOrDefaultAsync();

        return histories.Select(h => new SiblingDto(
            h.StudentId,
            h.Student.StudentNumber,
            $"{h.Student.FirstName} {h.Student.Surname}",
            h.Grade.Name,
            h.Grade.Level,
            h.Student.GuardianPhone,
            GetsDiscount: h.Student.IsStaffChild
                       || (forcedStudentId.HasValue
                            ? forcedStudentId.Value == h.StudentId
                            : SiblingGetsDiscount(h.StudentId, groupFlat))
        )).ToList();
    }

    public async Task<List<SiblingDto>> FindByGuardianPhoneAsync(string phone, int academicYearId)
    {
        var normalised = phone.Replace(" ", "").Replace("-", "");

        var histories = await _db.StudentGradeHistory.AsNoTracking()
            .Include(h => h.Student)
            .Include(h => h.Grade)
            .Where(h => h.AcademicYearId == academicYearId
                     && h.Student.IsActive
                     && !h.IsGraduated
                     && h.Student.GuardianPhone.Replace(" ", "").Replace("-", "") == normalised)
            .OrderBy(h => h.Grade.Level)
            .ToListAsync();

        var groupFlat = histories.Select(h => (h.StudentId, GradeLevel: h.Grade.Level)).ToList();

        return histories.Select(h => new SiblingDto(
            h.StudentId,
            h.Student.StudentNumber,
            $"{h.Student.FirstName} {h.Student.Surname}",
            h.Grade.Name,
            h.Grade.Level,
            h.Student.GuardianPhone,
            GetsDiscount: h.Student.IsStaffChild || SiblingGetsDiscount(h.StudentId, groupFlat)
        )).ToList();
    }
}