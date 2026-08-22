using Microsoft.EntityFrameworkCore;
using SchoolPaymentSystem.Data;
using SchoolPaymentSystem.DTO.Admin;
using SchoolPaymentSystem.DTO.Student;
using SchoolPaymentSystem.Exceptions;
using SchoolPaymentSystem.Helpers;
using SchoolPaymentSystem.Models.grade;
using SchoolPaymentSystem.Models.payment;
using SchoolPaymentSystem.Models.user;
using SchoolPaymentSystem.Services.Interfaces;

namespace SchoolPaymentSystem.Services;

public class StudentService : IStudentService
{
    private readonly ApplicationDbContext _db;
    private readonly IAuditService _audit;
    private readonly IFeeRuleService _feeRules;
    private readonly ICurrentUser _currentUser;

    public StudentService(ApplicationDbContext db, IAuditService audit, IFeeRuleService feeRules, ICurrentUser currentUser)
    {
        _db = db; _audit = audit; _feeRules = feeRules; _currentUser = currentUser;
    }

    // ── Create ────────────────────────────────────────────────────────────────

    public async Task<StudentDto> CreateAsync(CreateStudentRequest request)
    {
        if (!await _db.Grade.AnyAsync(g => g.Id == request.GradeId))
            throw new NotFoundException("Grade", request.GradeId);

        if (!await _db.AcademicYear.AnyAsync(a => a.Id == request.AcademicYearId))
            throw new NotFoundException("AcademicYear", request.AcademicYearId);

        // Sequential number per academic year
        var year = await _db.AcademicYear.FindAsync(request.AcademicYearId)
                   ?? throw new NotFoundException("AcademicYear", request.AcademicYearId);

        // Derive sequence from the highest existing number this year to avoid
        // duplicates under concurrent inserts (count can be stale mid-transaction)
        var yearInt = int.TryParse(year.Name, out var parsedYear) ? parsedYear : DateTime.UtcNow.Year;
        var prefix = $"SCH-{yearInt}-";
        var maxSequence = await _db.Student
            .Where(s => s.StudentNumber.StartsWith(prefix))
            .Select(s => s.StudentNumber)
            .ToListAsync();
        var nextSeq = maxSequence.Count == 0
            ? 1
            : maxSequence
                .Select(n => int.TryParse(n.Replace(prefix, ""), out var seq) ? seq : 0)
                .Max() + 1;
        var number = NumberGenerator.StudentNumber(yearInt, nextSeq);

        var student = new Student
        {
            StudentNumber = number,
            FirstName = request.FirstName,
            Surname = request.Surname,
            DateOfBirth = request.DateOfBirth,
            Gender = request.Gender,
            GuardianName = request.GuardianName,
            GuardianPhone = request.GuardianPhone,
            GuardianEmail = request.GuardianEmail,
            Address = request.Address,
            EnrollmentDate = DateTime.UtcNow,
            IsStaffChild = request.IsStaffChild,
            GuardianGroupId = request.GuardianGroupId,
            OwesAdmissionFee = request.OwesAdmissionFee,
            SkipsGrade6RegistrationArrear = request.SkipsGrade6RegistrationArrear,
            GradeHistories =
            [
                new StudentGradeHistory
                {
                    GradeId             = request.GradeId,
                    AcademicYearId      = request.AcademicYearId,
                    IsActive            = true,
                    StartingTermMonthId = request.StartingTermMonthId
                }
            ]
        };

        _db.Student.Add(student);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("CREATE_STUDENT", "Student", student.Id.ToString(),
            newValues: new { student.StudentNumber, student.FirstName, student.Surname });

        return await GetStudentDtoAsync(student.Id);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    public async Task<StudentDto> UpdateAsync(int id, UpdateStudentRequest request)
    {
        var student = await _db.Student.FindAsync(id) ?? throw new NotFoundException("Student", id);
        var old = new { student.FirstName, student.Surname, student.GuardianPhone };

        student.FirstName = request.FirstName;
        student.Surname = request.Surname;
        student.DateOfBirth = request.DateOfBirth;
        student.Gender = request.Gender;
        student.GuardianName = request.GuardianName;
        student.GuardianPhone = request.GuardianPhone;
        student.GuardianEmail = request.GuardianEmail;
        student.Address = request.Address;
        student.IsStaffChild = request.IsStaffChild;
        student.GuardianGroupId = request.GuardianGroupId;
        // Only allow setting OwesAdmissionFee to true; once paid it is cleared by
        // the payment flow — don't let an edit overwrite a paid status back to true
        // unless the user explicitly ticks the box.
        student.OwesAdmissionFee = request.OwesAdmissionFee;
        student.SkipsGrade6RegistrationArrear = request.SkipsGrade6RegistrationArrear;

        // ── Grade correction: if a grade + academic year are supplied, update the
        //    StudentGradeHistory for that year. This fixes the case where a student
        //    was placed in the wrong grade and needs to be moved to the correct one.
        if (request.GradeId.HasValue && request.AcademicYearId.HasValue)
        {
            if (!await _db.Grade.AnyAsync(g => g.Id == request.GradeId.Value))
                throw new NotFoundException("Grade", request.GradeId.Value);

            var history = await _db.StudentGradeHistory
                .FirstOrDefaultAsync(h => h.StudentId == id && h.AcademicYearId == request.AcademicYearId.Value);

            if (history is not null)
            {
                // Update the existing history record to the correct grade
                var oldGradeId = history.GradeId;
                history.GradeId = request.GradeId.Value;
                await _audit.LogAsync("GRADE_CORRECTION", "StudentGradeHistory", history.Id.ToString(),
                    new { GradeId = oldGradeId, AcademicYearId = history.AcademicYearId },
                    new { GradeId = request.GradeId.Value, AcademicYearId = history.AcademicYearId });
            }
            else
            {
                // No history for this year — create a new one
                _db.StudentGradeHistory.Add(new StudentGradeHistory
                {
                    StudentId      = id,
                    GradeId        = request.GradeId.Value,
                    AcademicYearId = request.AcademicYearId.Value,
                    IsActive       = true,
                    IsGraduated    = false,
                });
            }
        }

        await _db.SaveChangesAsync();
        await _audit.LogAsync("UPDATE_STUDENT", "Student", id.ToString(), old,
            new { student.FirstName, student.Surname, student.GuardianPhone });

        return await GetStudentDtoAsync(id);
    }

    public async Task DeactivateAsync(int id, DeactivateStudentRequest request)
    {
        var student = await _db.Student.FindAsync(id)
            ?? throw new NotFoundException("Student", id);

        if (!Enum.TryParse<StudentDeactivationReason>(request.Reason, ignoreCase: true, out var reason))
            throw new ValidationException("reason",
                "Reason must be 'Transferred', 'Deceased', or 'Graduated'.");

        student.IsActive = false;
        student.DeactivationReason = reason;
        student.DeactivationNotes = request.Notes;
        student.DeactivatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await _audit.LogAsync("DEACTIVATE_STUDENT", "Student", id.ToString(),
            newValues: new { reason = request.Reason, request.Notes });
    }

    // ── Bulk Enrol ────────────────────────────────────────────────────────────

    public async Task<BulkEnrolResultDto> BulkEnrolAsync(BulkEnrolRequest request)
    {
        if (request.Students.Count > 10)
            throw new ValidationException("students", "Bulk enrolment accepts a maximum of 10 students at once.");

        if (!await _db.AcademicYear.AnyAsync(a => a.Id == request.AcademicYearId))
            throw new NotFoundException("AcademicYear", request.AcademicYearId);

        var year = await _db.AcademicYear.FindAsync(request.AcademicYearId)!;

        var yearInt = int.TryParse(year!.Name, out var y) ? y : DateTime.UtcNow.Year;
        var yearPrefix = $"SCH-{yearInt}-";
        var existingNumbers = await _db.Student
            .Where(s => s.StudentNumber.StartsWith(yearPrefix))
            .Select(s => s.StudentNumber)
            .ToListAsync();
        int baseSeq = existingNumbers.Count == 0
            ? 0
            : existingNumbers
                .Select(n => int.TryParse(n.Replace(yearPrefix, ""), out var sq) ? sq : 0)
                .Max();

        var created = new List<StudentDto>();
        var skippedReasons = new List<string>();
        int enrolled = 0;
        int skipped = 0;

        foreach (var row in request.Students)
        {
            // Skip rows with blank required fields
            if (string.IsNullOrWhiteSpace(row.FirstName) || string.IsNullOrWhiteSpace(row.Surname))
            {
                skipped++;
                skippedReasons.Add($"Row skipped — first name or surname is blank.");
                continue;
            }

            // Duplicate check: same name + DOB already enrolled this year
            bool duplicate = await _db.StudentGradeHistory
                .AnyAsync(h => h.AcademicYearId == request.AcademicYearId
                            && h.Student.FirstName == row.FirstName.Trim()
                            && h.Student.Surname == row.Surname.Trim()
                            && h.Student.DateOfBirth.Date == row.DateOfBirth.Date);

            if (duplicate)
            {
                skipped++;
                skippedReasons.Add($"{row.FirstName} {row.Surname} — duplicate (same name + DOB already enrolled this year).");
                continue;
            }

            var sequence = baseSeq + enrolled + 1;
            var number = NumberGenerator.StudentNumber(yearInt, sequence);

            var student = new Student
            {
                StudentNumber = number,
                FirstName = row.FirstName.Trim(),
                Surname = row.Surname.Trim(),
                DateOfBirth = row.DateOfBirth,
                Gender = row.Gender,
                GuardianName = row.GuardianName,
                GuardianPhone = row.GuardianPhone,
                GuardianEmail = row.GuardianEmail,
                EnrollmentDate = DateTime.UtcNow,
                IsStaffChild = row.IsStaffChild,
                GuardianGroupId = row.GuardianGroupId,
                GradeHistories =
                [
                    new StudentGradeHistory
                    {
                        GradeId             = row.GradeId,
                        AcademicYearId      = request.AcademicYearId,
                        IsActive            = true,
                        StartingTermMonthId = request.StartingTermMonthId,
                    }
                ]
            };

            _db.Student.Add(student);
            await _db.SaveChangesAsync();

            enrolled++;
            created.Add(await GetStudentDtoAsync(student.Id));
            await _audit.LogAsync("BULK_ENROL_STUDENT", "Student", student.Id.ToString(),
                newValues: new { student.StudentNumber, student.FirstName, student.Surname });
        }

        return new BulkEnrolResultDto(enrolled, skipped, skippedReasons, created);
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    public async Task<StudentDto> GetByIdAsync(int id) =>
        await GetStudentDtoAsync(id);

    public async Task<StudentDto> GetByStudentNumberAsync(string number)
    {
        var student = await _db.Student.AsNoTracking()
            .FirstOrDefaultAsync(s => s.StudentNumber == number)
            ?? throw new NotFoundException($"Student '{number}' not found.");
        return await GetStudentDtoAsync(student.Id);
    }

    public async Task<PagedResult<StudentWithGradeDto>> SearchAsync(StudentSearchRequest request)
    {
        var q = _db.Student.AsNoTracking()
            .Include(s => s.GradeHistories).ThenInclude(h => h.Grade)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Query))
        {
            var lower = request.Query.ToLower();
            q = q.Where(s =>
                s.StudentNumber.ToLower().Contains(lower) ||
                s.FirstName.ToLower().Contains(lower) ||
                s.Surname.ToLower().Contains(lower));
        }

        if (request.GradeId.HasValue)
            q = q.Where(s => s.GradeHistories
                .Any(h => h.GradeId == request.GradeId && h.AcademicYearId == request.AcademicYearId));

        if (!string.IsNullOrWhiteSpace(request.Gender))
            q = q.Where(s => s.Gender == request.Gender);

        // Filter by active status — default to active only (excludes graduated/deactivated)
        if (request.IsActive.HasValue)
            q = q.Where(s => s.IsActive == request.IsActive.Value);
        else
            q = q.Where(s => s.IsActive);  // default: only active students

        var total = await q.CountAsync();
        var items = await q
            .OrderBy(s => s.Surname).ThenBy(s => s.FirstName)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(s => new StudentWithGradeDto(
                s.Id,
                s.StudentNumber,
                s.FirstName,
                s.Surname,
                s.FirstName + " " + s.Surname,
                s.Gender,
                s.GradeHistories
                    .Where(h => h.AcademicYearId == request.AcademicYearId)
                    .Select(h => h.Grade.Name).FirstOrDefault() ?? "—",
                s.GradeHistories
                    .Where(h => h.AcademicYearId == request.AcademicYearId)
                    .Select(h => h.GradeId).FirstOrDefault(),
                s.GuardianName,
                s.GuardianPhone,
                s.EnrollmentDate,
                s.IsActive,
                s.GradeHistories
                    .Where(h => h.AcademicYearId == request.AcademicYearId)
                    .Select(h => h.IsGraduated).FirstOrDefault(),
                s.GradeHistories
                    .Where(h => h.AcademicYearId == request.AcademicYearId)
                    .Select(h => h.StartingTermMonthId).FirstOrDefault()))
            .ToListAsync();

        return new PagedResult<StudentWithGradeDto>(
            items, total, request.Page, request.PageSize,
            (int)Math.Ceiling(total / (double)request.PageSize));
    }

    // ── Grade View ────────────────────────────────────────────────────────────

    public async Task<List<StudentGradeViewRow>> GetGradeViewAsync(
        int gradeId, int termId, int academicYearId)
    {
        var termMonths = await _db.TermMonth.AsNoTracking()
            .Where(m => m.TermId == termId)
            .OrderBy(m => m.SortOrder)
            .ToListAsync();

        var termFeeRecord = await _db.TermFee.AsNoTracking()
            .Where(f => f.TermId == termId && f.GradeId == gradeId)
            .FirstOrDefaultAsync();

        // Load any per-month tuition overrides for this grade+term (TermMonthFee table)
        var termMonthFees = termFeeRecord != null
            ? await _db.TermMonthFee.AsNoTracking()
                .Where(mf => mf.TermFeeId == termFeeRecord.Id)
                .ToDictionaryAsync(mf => mf.TermMonthId, mf => mf.OverrideAmount)
            : new Dictionary<int, decimal>();

        var students = await _db.Student.AsNoTracking()
            .Where(s => s.IsActive && s.GradeHistories
                .Any(h => h.GradeId == gradeId && h.AcademicYearId == academicYearId && !h.IsGraduated))
            .OrderBy(s => s.Surname)
            .ToListAsync();

        var studentIds = students.Select(s => s.Id).ToList();

        // Load grade histories to get each student's StartingTermMonthId.
        // A student may have one record per term they enrolled in; we only want
        // the record whose StartingTermMonthId belongs to THIS term — otherwise
        // a mid-year joiner's Term 2 start month would never match Term 3 months
        // and every cell would render N/A instead of Unpaid.
        var currentTermMonthIds = termMonths.Select(m => m.Id).ToHashSet();
        var allGradeHistories = await _db.StudentGradeHistory.AsNoTracking()
            .Where(h => studentIds.Contains(h.StudentId) && h.AcademicYearId == academicYearId)
            .ToListAsync();
        // Only honour StartingTermMonthId when it falls inside this term's months;
        // otherwise null = student owes the full term.
        var gradeHistories = allGradeHistories
            .GroupBy(h => h.StudentId)
            .ToDictionary(
                g => g.Key,
                g =>
                {
                    var thisTermRecord = g.FirstOrDefault(h =>
                        h.StartingTermMonthId.HasValue &&
                        currentTermMonthIds.Contains(h.StartingTermMonthId.Value));
                    return thisTermRecord?.StartingTermMonthId;
                });

        // Load ALL active fee overrides for every student in this grade in one query
        var allOverrides = await _db.StudentFeeOverride.AsNoTracking()
            .Where(o => studentIds.Contains(o.StudentId)
                     && o.AcademicYearId == academicYearId
                     && o.IsActive)
            .ToListAsync();

        // Load tuition breakdowns for these students in this term in one query
        var breakdowns = await _db.PaymentBreakdown.AsNoTracking()
            .Include(pb => pb.Payment)
            .Include(pb => pb.TermMonth)
            .Where(pb => studentIds.Contains(pb.Payment.StudentId)
                      && pb.Payment.TermId == termId
                      && pb.Payment.AcademicYearId == academicYearId
                      && pb.Payment.Status == PaymentStatus.Completed
                      && pb.ItemType == PaymentItemType.Tuition
                      && pb.TermMonthId != null)
            .ToListAsync();

        // Load sports levy breakdowns separately
        var sportsBreakdowns = await _db.PaymentBreakdown.AsNoTracking()
            .Include(pb => pb.Payment)
            .Where(pb => studentIds.Contains(pb.Payment.StudentId)
                      && pb.Payment.TermId == termId
                      && pb.Payment.AcademicYearId == academicYearId
                      && pb.Payment.Status == PaymentStatus.Completed
                      && pb.ItemType == PaymentItemType.SportsLevy)
            .GroupBy(pb => pb.Payment.StudentId)
            .Select(g => new { StudentId = g.Key, Paid = g.Sum(x => x.AmountPaid) })
            .ToDictionaryAsync(x => x.StudentId, x => x.Paid);

        var rows = new List<StudentGradeViewRow>();
        int monthCount = termMonths.Count;

        foreach (var student in students)
        {
            // Per-student overrides
            var studentOverrides = allOverrides.Where(o => o.StudentId == student.Id).ToList();

            // Resolve effective staff-child status — respects ForceStaffChildRate whole-term override
            bool isStaffChild = await _feeRules.IsEffectiveStaffChildAsync(student.Id, academicYearId);

            // Whole-term tuition override (TermMonthId == null, OverrideTuitionAmount set)
            var wholetermOverride = studentOverrides
                .FirstOrDefault(o => o.TermMonthId == null && o.OverrideTuitionAmount.HasValue);

            decimal baseTuition = wholetermOverride?.OverrideTuitionAmount
                ?? (isStaffChild && termFeeRecord?.StaffChildTuitionAmount.HasValue == true
                    ? termFeeRecord!.StaffChildTuitionAmount!.Value
                    : termFeeRecord?.TuitionAmount ?? 0m);

            decimal sportsLevyDue = isStaffChild && termFeeRecord?.StaffChildSportsLevyAmount.HasValue == true
                ? termFeeRecord!.StaffChildSportsLevyAmount!.Value
                : termFeeRecord?.SportsLevyAmount ?? 0m;

            decimal monthly   = monthCount > 0 ? Math.Round(baseTuition / monthCount, 2) : 0m;
            decimal lastMonth = monthCount > 0 ? baseTuition - monthly * (monthCount - 1) : 0m;

            var studentBreakdowns = breakdowns.Where(pb => pb.Payment.StudentId == student.Id).ToList();
            var startingMonthId   = gradeHistories.GetValueOrDefault(student.Id);
            bool reachedStart     = !startingMonthId.HasValue;

            var cells = new List<MonthStatusCell>();
            for (int i = 0; i < termMonths.Count; i++)
            {
                var month = termMonths[i];

                // Month before this student's enrollment — no fee obligation
                if (!reachedStart)
                {
                    if (month.Id == startingMonthId!.Value)
                        reachedStart = true;
                    else
                    {
                        cells.Add(new MonthStatusCell(month.MonthName, 0m, 0m, 0m, "N/A"));
                        continue;
                    }
                }

                // Per-month override wins over everything else (same logic as FeeRuleService)
                var monthOverride = studentOverrides.FirstOrDefault(o => o.TermMonthId == month.Id);

                decimal due;
                if (monthOverride?.OverrideTuitionAmount.HasValue == true)
                {
                    due = monthOverride.OverrideTuitionAmount!.Value;
                }
                else if (monthOverride?.ForceStaffChildRate == true
                         && termFeeRecord?.StaffChildTuitionAmount.HasValue == true)
                {
                    decimal staffMonthly = Math.Round(termFeeRecord!.StaffChildTuitionAmount!.Value / monthCount, 2);
                    due = (i == monthCount - 1)
                        ? termFeeRecord!.StaffChildTuitionAmount!.Value - staffMonthly * (monthCount - 1)
                        : staffMonthly;
                }
                else if (termMonthFees.TryGetValue(month.Id, out var gradeMonthOverride))
                {
                    // Admin configured a per-month amount for this grade/term
                    due = gradeMonthOverride;
                }
                else
                {
                    due = (i == monthCount - 1) ? lastMonth : monthly;
                }

                decimal paid    = studentBreakdowns
                    .Where(pb => pb.TermMonthId == (int?)month.Id)
                    .Sum(pb => pb.AmountPaid);
                decimal balance = Math.Max(0m, due - paid);
                var status      = paid >= due ? "Paid" : paid > 0 ? "Partial" : "Unpaid";

                cells.Add(new MonthStatusCell(month.MonthName, due, paid, balance, status));
            }

            decimal totalDue   = cells.Sum(c => c.AmountDue);
            decimal totalPaid  = cells.Sum(c => c.AmountPaid);
            decimal totalOwing = cells.Sum(c => c.Balance);
            var overall = totalOwing == 0 ? "Paid" : totalPaid > 0 ? "Partial" : "Owing";

            // Sports levy
            decimal sportsPaid    = sportsBreakdowns.GetValueOrDefault(student.Id, 0m);
            decimal sportsBalance = Math.Max(0m, sportsLevyDue - sportsPaid);

            rows.Add(new StudentGradeViewRow(
                student.Id, student.StudentNumber,
                $"{student.FirstName} {student.Surname}",
                cells, totalDue, totalPaid, totalOwing, overall,
                SportsDue: sportsLevyDue,
                SportsPaid: sportsPaid,
                SportsBalance: sportsBalance));
        }

        // ── Extension month fee cells for this grade ───────────────────────
        // Load active extension months configured for this grade in the current term
        var extensionMonths = await _db.TermExtensionMonth.AsNoTracking()
            .Include(em => em.ExtensionFees)
            .Where(em => em.TermId == termId && em.IsActive
                      && em.ExtensionFees.Any(ef => ef.GradeId == gradeId))
            .OrderBy(em => em.MonthNumber)
            .ToListAsync();

        if (extensionMonths.Any())
        {
            // Load all ExtensionFee breakdowns for these students in this term
            var extMonthIds = extensionMonths.Select(em => em.Id).ToList();
            var extBreakdowns = await _db.PaymentBreakdown.AsNoTracking()
                .Include(pb => pb.Payment)
                .Where(pb => studentIds.Contains(pb.Payment.StudentId)
                          && pb.Payment.TermId == termId
                          && pb.Payment.AcademicYearId == academicYearId
                          && pb.Payment.Status == PaymentStatus.Completed
                          && pb.ItemType == PaymentItemType.ExtensionFee
                          && pb.CustomFeeId != null
                          && extMonthIds.Contains(pb.CustomFeeId!.Value))
                .ToListAsync();

            for (int ri = 0; ri < rows.Count; ri++)
            {
                var row = rows[ri];
                var extCells = new List<ExtensionMonthCell>();

                foreach (var em in extensionMonths)
                {
                    var extFee = em.ExtensionFees.FirstOrDefault(ef => ef.GradeId == gradeId);
                    if (extFee is null)
                    {
                        extCells.Add(new ExtensionMonthCell(em.Id, em.MonthName, 0m, 0m, 0m, "N/A"));
                        continue;
                    }

                    decimal due  = extFee.Amount;
                    decimal paid = extBreakdowns
                        .Where(pb => pb.Payment.StudentId == row.StudentId && pb.CustomFeeId == em.Id)
                        .Sum(pb => pb.AmountPaid);
                    decimal bal  = Math.Max(0m, due - paid);
                    string status = paid >= due ? "Paid" : paid > 0 ? "Partial" : "Unpaid";

                    extCells.Add(new ExtensionMonthCell(em.Id, em.MonthName, due, paid, bal, status));
                }

                rows[ri] = row with { ExtensionCells = extCells };
            }
        }

        // ── Compute cross-term arrears for each student ──────────────────────
        // Load the current term's TermNumber so we only show arrears from
        // EARLIER terms (lower TermNumber). This prevents future-term balances
        // from bleeding back when a term is temporarily toggled active.
        var currentTerm = await _db.Term.AsNoTracking()
            .Where(t => t.Id == termId)
            .Select(t => new { t.Id, t.TermNumber, t.AcademicYearId })
            .FirstAsync();

        // Previous terms = same academic year, lower term number
        var previousTermsThisYear = await _db.Term.AsNoTracking()
            .Where(t => t.AcademicYearId == academicYearId
                     && t.TermNumber < currentTerm.TermNumber)
            .Select(t => new { t.Id, t.Name, t.TermNumber, t.AcademicYearId })
            .ToListAsync();

        // Previous academic years (all terms) — only years with lower Year value
        var currentYear = await _db.AcademicYear.AsNoTracking()
            .Where(y => y.Id == academicYearId)
            .Select(y => y.Year)
            .FirstAsync();

        var previousYearTerms = await _db.Term.AsNoTracking()
            .Include(t => t.AcademicYear)
            .Where(t => t.AcademicYear.Year < currentYear)
            .Select(t => new { t.Id, t.Name, t.TermNumber, t.AcademicYearId, YearName = t.AcademicYear.Name })
            .ToListAsync();

        var allPriorTerms = previousTermsThisYear
            .Select(t => new { t.Id, Label = t.Name, t.AcademicYearId })
            .Concat(previousYearTerms
                .Select(t => new { t.Id, Label = $"{t.YearName} {t.Name}", t.AcademicYearId }))
            .ToList();

        if (allPriorTerms.Any())
        {
            var allPriorTermIds = allPriorTerms.Select(t => t.Id).ToList();
            var priorYearIds    = allPriorTerms.Select(t => t.AcademicYearId).Distinct().ToList();

            var arrearBreakdowns = await _db.PaymentBreakdown.AsNoTracking()
                .Include(pb => pb.Payment)
                .Where(pb => studentIds.Contains(pb.Payment.StudentId)
                          && allPriorTermIds.Contains(pb.Payment.TermId)
                          && priorYearIds.Contains(pb.Payment.AcademicYearId)
                          && pb.Payment.Status == PaymentStatus.Completed
                          && (pb.ItemType == PaymentItemType.Tuition
                           || pb.ItemType == PaymentItemType.Arrears))
                .ToListAsync();

            foreach (var row in rows.ToList())
            {
                var arrearDetails = new List<string>();
                decimal totalArrears = 0m;

                foreach (var term in allPriorTerms)
                {
                    var tMonths = await _db.TermMonth.AsNoTracking()
                        .Where(m => m.TermId == term.Id)
                        .OrderBy(m => m.SortOrder)
                        .ToListAsync();

                    if (!tMonths.Any()) continue;

                    // Find the student's grade in that term's academic year
                    var gradeHistForTerm = allGradeHistories.FirstOrDefault(h =>
                        h.StudentId == row.StudentId && h.AcademicYearId == term.AcademicYearId);
                    if (gradeHistForTerm is null)
                    {
                        gradeHistForTerm = await _db.StudentGradeHistory.AsNoTracking()
                            .FirstOrDefaultAsync(h => h.StudentId == row.StudentId
                                                   && h.AcademicYearId == term.AcademicYearId);
                    }
                    if (gradeHistForTerm is null) continue;

                    var tFee = await _db.TermFee.AsNoTracking()
                        .Include(tf => tf.MonthFees)
                        .FirstOrDefaultAsync(f => f.TermId == term.Id && f.GradeId == gradeHistForTerm.GradeId);

                    if (tFee == null) continue;

                    decimal tMonthCount = tMonths.Count;
                    var tOverrideMap    = tFee.MonthFees.ToDictionary(mf => mf.TermMonthId, mf => mf.OverrideAmount);

                    var termMonthIdsForTerm = tMonths.Select(m => (int?)m.Id).ToList();
                    var sOverrides = await _db.StudentFeeOverride.AsNoTracking()
                        .Where(o => o.StudentId == row.StudentId
                                 && o.AcademicYearId == term.AcademicYearId
                                 && o.IsActive
                                 && (o.TermMonthId == null || termMonthIdsForTerm.Contains(o.TermMonthId)))
                        .ToListAsync();

                    var tMonthIds = tMonths.Select(m => m.Id).ToHashSet();
                    var sgh = await _db.StudentGradeHistory.AsNoTracking()
                        .Where(h => h.StudentId == row.StudentId
                                 && h.StartingTermMonthId != null
                                 && tMonthIds.Contains(h.StartingTermMonthId.Value))
                        .FirstOrDefaultAsync();

                    bool isStaffC = await _feeRules.IsEffectiveStaffChildAsync(row.StudentId, term.AcademicYearId);
                    var wholeOverride = sOverrides.FirstOrDefault(o => o.TermMonthId == null && o.OverrideTuitionAmount.HasValue);
                    decimal baseTuit = wholeOverride?.OverrideTuitionAmount
                        ?? (isStaffC && tFee.StaffChildTuitionAmount.HasValue ? tFee.StaffChildTuitionAmount!.Value : tFee.TuitionAmount);

                    decimal termDue  = 0m;
                    decimal termPaid = 0m;
                    bool    reached  = sgh == null || sgh.StartingTermMonthId == null;

                    for (int i = 0; i < tMonths.Count; i++)
                    {
                        var tm = tMonths[i];
                        if (!reached)
                        {
                            if (tm.Id == sgh!.StartingTermMonthId) reached = true;
                            else continue;
                        }

                        var mOv = sOverrides.FirstOrDefault(o => o.TermMonthId == tm.Id);
                        decimal due;
                        if (mOv?.OverrideTuitionAmount.HasValue == true)
                            due = mOv.OverrideTuitionAmount!.Value;
                        else if (tOverrideMap.TryGetValue(tm.Id, out var gMOv))
                            due = gMOv;
                        else
                        {
                            decimal m2 = Math.Round(baseTuit / tMonthCount, 2);
                            decimal l2 = baseTuit - m2 * (tMonthCount - 1);
                            due = (i == tMonths.Count - 1) ? l2 : m2;
                        }

                        decimal paid = arrearBreakdowns
                            .Where(pb => pb.Payment.StudentId == row.StudentId
                                      && pb.Payment.TermId == term.Id
                                      && pb.TermMonthId == (int?)tm.Id)
                            .Sum(pb => pb.AmountPaid);

                        termDue  += due;
                        termPaid += paid;
                    }

                    // Credit any Arrears-type payments made against this term
                    decimal arrearsPaid = arrearBreakdowns
                        .Where(pb => pb.Payment.StudentId == row.StudentId
                                  && pb.Payment.TermId == term.Id
                                  && pb.ItemType == PaymentItemType.Arrears)
                        .Sum(pb => pb.AmountPaid);
                    termPaid += arrearsPaid;

                    decimal termBal = Math.Max(0m, termDue - termPaid);
                    if (termBal > 0.005m)
                    {
                        totalArrears += termBal;
                        arrearDetails.Add($"{term.Label}: ${termBal:F2}");
                    }
                }

                if (totalArrears > 0.005m)
                {
                    int idx = rows.IndexOf(row);
                    rows[idx] = row with
                    {
                        ArrearsAmount  = totalArrears,
                        ArrearsSummary = string.Join(", ", arrearDetails)
                    };
                }
            }
        }

        return rows;
    }

    // ── Promotion ─────────────────────────────────────────────────────────────

    public async Task PromoteStudentsAsync(int fromYearId, int toYearId)
    {
        var maxLevel = await _db.Grade.MaxAsync(g => g.Level);

        var currentHistories = await _db.StudentGradeHistory
            .Include(h => h.Grade)
            .Include(h => h.Student)
            .Where(h => h.AcademicYearId == fromYearId && h.IsActive && !h.IsGraduated)
            .ToListAsync();

        var promoted = 0;
        var graduated = 0;

        foreach (var history in currentHistories)
        {
            if (history.Grade.Level >= maxLevel)
            {
                // Student has completed the highest grade — mark as graduated & deactivate
                history.IsGraduated = true;
                history.IsActive = false;

                // Mark the graduation on the student record itself
                var student = history.Student;
                student.IsActive = false;

                // Create a history row for the new year marking graduation
                var exists = await _db.StudentGradeHistory.AnyAsync(
                    h => h.StudentId == history.StudentId && h.AcademicYearId == toYearId);
                if (!exists)
                {
                    _db.StudentGradeHistory.Add(new StudentGradeHistory
                    {
                        StudentId = history.StudentId,
                        GradeId = history.GradeId,   // stays in same grade (for records)
                        AcademicYearId = toYearId,
                        IsActive = false,
                        IsGraduated = true
                    });
                }
                graduated++;
                continue;
            }

            var nextGrade = await _db.Grade
                .FirstOrDefaultAsync(g => g.Level == history.Grade.Level + 1);
            if (nextGrade is null) continue;

            // Avoid duplicate if already promoted
            var alreadyExists = await _db.StudentGradeHistory.AnyAsync(
                h => h.StudentId == history.StudentId && h.AcademicYearId == toYearId);
            if (alreadyExists) continue;

            // If the student is moving into Grade 7 and has SkipsGrade6RegistrationArrear = false,
            // but they were a normal Grade 6 student here, the flag stays false (correct — they owe the arrear).
            // If they somehow had the flag set on their student record we preserve it automatically
            // because SkipsGrade6RegistrationArrear is on the Student, not StudentGradeHistory.

            _db.StudentGradeHistory.Add(new StudentGradeHistory
            {
                StudentId      = history.StudentId,
                GradeId        = nextGrade.Id,
                AcademicYearId = toYearId,
                IsActive       = true,
            });
            promoted++;
        }

        await _db.SaveChangesAsync();
        await _audit.LogAsync("PROMOTE_STUDENTS", "StudentGradeHistory",
            newValues: new { fromYearId, toYearId, promoted, graduated });
    }

    public async Task<int> AssignSiblingGroupAsync(List<int> studentIds)
    {
        if (!studentIds.Any()) throw new ArgumentException("No student IDs provided.");

        var students = await _db.Student
            .Where(s => studentIds.Contains(s.Id))
            .ToListAsync();

        // Reuse an existing group number if any sibling already has one
        var existingGroup = students
            .Where(s => s.GuardianGroupId.HasValue)
            .Select(s => s.GuardianGroupId!.Value)
            .FirstOrDefault();

        int groupId = existingGroup != 0
            ? existingGroup
            : (await _db.Student.MaxAsync(s => (int?)s.GuardianGroupId) ?? 0) + 1;

        foreach (var s in students)
            s.GuardianGroupId = groupId;

        await _db.SaveChangesAsync();
        return groupId;
    }
    // ── Private ───────────────────────────────────────────────────────────────

    private async Task<StudentDto> GetStudentDtoAsync(int id)
    {
        var s = await _db.Student.AsNoTracking()
                    .Include(x => x.GradeHistories.OrderByDescending(h => h.AcademicYearId))
                        .ThenInclude(h => h.Grade)
                    .FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new NotFoundException("Student", id);

        var latestHistory = s.GradeHistories.FirstOrDefault();

        return new StudentDto(
            s.Id, s.StudentNumber, s.FirstName, s.Surname,
            $"{s.FirstName} {s.Surname}", s.DateOfBirth, s.Gender,
            s.GuardianName, s.GuardianPhone, s.GuardianEmail, s.Address,
            s.IsActive,
            latestHistory?.IsGraduated ?? false,
            s.EnrollmentDate,
            latestHistory?.StartingTermMonthId,
            s.IsStaffChild,
            s.GuardianGroupId,
            s.OwesAdmissionFee,
            s.SkipsGrade6RegistrationArrear,
            s.DeactivationReason.ToString(),
            s.DeactivationNotes,
            s.DeactivatedAt,
            latestHistory?.Grade?.Name,
            latestHistory?.GradeId,
            latestHistory?.AcademicYearId);
    }

    // ── Alumni — graduated / deactivated students ─────────────────────────────

    public async Task<List<GraduatedStudentDto>> GetGraduatedWithBalanceAsync()
    {
        // Load all inactive students (graduated, transferred, or deceased)
        var students = await _db.Student.AsNoTracking()
            .AsSplitQuery()
            .Include(s => s.GradeHistories.OrderByDescending(h => h.AcademicYearId))
                .ThenInclude(h => h.Grade)
            .Include(s => s.GradeHistories)
                .ThenInclude(h => h.AcademicYear)
            .Where(s => !s.IsActive)
            .OrderBy(s => s.Surname).ThenBy(s => s.FirstName)
            .ToListAsync();

        var result = new List<GraduatedStudentDto>();

        foreach (var student in students)
        {
            // Sum all tuition paid across every year (exclude written-off payments
            // from the "paid" total so balance reflects actual cash received)
            var totalPaid = await _db.PaymentBreakdown.AsNoTracking()
                .Include(pb => pb.Payment)
                .Where(pb => pb.Payment.StudentId == student.Id
                          && pb.Payment.Status    == PaymentStatus.Completed
                          && pb.ItemType          == PaymentItemType.Tuition)
                .SumAsync(pb => (decimal?)pb.AmountPaid) ?? 0m;

            // Sum all written-off amounts (so balance = 0 after write-off)
            var writtenOff = await _db.PaymentBreakdown.AsNoTracking()
                .Include(pb => pb.Payment)
                .Where(pb => pb.Payment.StudentId == student.Id
                          && pb.Payment.Status    == PaymentStatus.WrittenOff
                          && pb.ItemType          == PaymentItemType.Tuition)
                .SumAsync(pb => (decimal?)pb.AmountPaid) ?? 0m;

            // Compute total tuition due across all years/terms
            var histories = student.GradeHistories.Where(h => h.IsActive || h.IsGraduated).ToList();
            decimal totalDue = 0m;

            foreach (var history in histories)
            {
                var termIds = await _db.Term.AsNoTracking()
                    .Where(t => t.AcademicYearId == history.AcademicYearId)
                    .Select(t => t.Id)
                    .ToListAsync();

                foreach (var termId in termIds)
                {
                    var fee = await _db.TermFee.AsNoTracking()
                        .Where(f => f.TermId == termId && f.GradeId == history.GradeId)
                        .Select(f => (decimal?)f.TuitionAmount)
                        .FirstOrDefaultAsync() ?? 0m;

                    var termMonths = await _db.TermMonth.AsNoTracking()
                        .Where(m => m.TermId == termId)
                        .OrderBy(m => m.SortOrder)
                        .ToListAsync();

                    if (termMonths.Count == 0 || fee == 0m) continue;

                    var monthlyFee   = Math.Round(fee / termMonths.Count, 2);
                    var lastMonthFee = fee - monthlyFee * (termMonths.Count - 1);

                    bool reachedStart = !history.StartingTermMonthId.HasValue;
                    for (int i = 0; i < termMonths.Count; i++)
                    {
                        if (!reachedStart)
                        {
                            if (termMonths[i].Id == history.StartingTermMonthId!.Value)
                                reachedStart = true;
                            else continue;
                        }
                        totalDue += i == termMonths.Count - 1 ? lastMonthFee : monthlyFee;
                    }
                }
            }

            // Balance = due - paid - writtenOff (written-off reduces what's still owed)
            var balance = Math.Max(0m, totalDue - totalPaid - writtenOff);

            var latestHistory = student.GradeHistories.FirstOrDefault();

            result.Add(new GraduatedStudentDto(
                student.Id,
                student.StudentNumber,
                $"{student.FirstName} {student.Surname}",
                student.Gender,
                student.GuardianName,
                student.GuardianPhone,
                student.DeactivationReason.ToString(),
                student.DeactivationNotes,
                student.DeactivatedAt,
                latestHistory?.Grade?.Name  ?? "—",
                latestHistory?.AcademicYear?.Name ?? "—",
                totalPaid,
                totalDue,
                balance,
                writtenOff > 0));
        }

        return result;
    }

    public async Task ClearArrearsAsync(int studentId, ClearArrearsRequest request)
    {
        var student = await _db.Student.FindAsync(studentId)
            ?? throw new NotFoundException("Student", studentId);

        if (student.IsActive)
            throw new BusinessRuleException(
                "Arrears can only be cleared for graduated or deactivated students. " +
                "For active students, record a payment instead.");

        // Find all tuition breakdown lines that are not yet fully paid or written off
        var unpaidBreakdowns = await _db.PaymentBreakdown.AsNoTracking()
            .Include(pb => pb.Payment)
            .Where(pb => pb.Payment.StudentId == studentId
                      && pb.Payment.Status    == PaymentStatus.Completed
                      && pb.ItemType          == PaymentItemType.Tuition
                      && pb.AmountPaid        < pb.AmountDue)
            .ToListAsync();

        // Compute actual outstanding balance by checking all terms
        var histories = await _db.StudentGradeHistory.AsNoTracking()
            .Where(h => h.StudentId == studentId)
            .ToListAsync();

        decimal totalDue  = 0m;
        decimal totalPaid = unpaidBreakdowns.Sum(b => b.AmountPaid)
            + await _db.PaymentBreakdown.AsNoTracking()
                .Include(pb => pb.Payment)
                .Where(pb => pb.Payment.StudentId == studentId
                          && pb.Payment.Status    == PaymentStatus.Completed
                          && pb.ItemType          == PaymentItemType.Tuition
                          && pb.AmountPaid        >= pb.AmountDue)
                .SumAsync(pb => (decimal?)pb.AmountPaid) ?? 0m;

        foreach (var history in histories)
        {
            var termIds = await _db.Term.AsNoTracking()
                .Where(t => t.AcademicYearId == history.AcademicYearId)
                .Select(t => t.Id).ToListAsync();

            foreach (var termId in termIds)
            {
                var fee = await _db.TermFee.AsNoTracking()
                    .Where(f => f.TermId == termId && f.GradeId == history.GradeId)
                    .Select(f => (decimal?)f.TuitionAmount)
                    .FirstOrDefaultAsync() ?? 0m;
                totalDue += fee;
            }
        }

        decimal balance = Math.Max(0m, totalDue - totalPaid);

        if (balance <= 0)
            throw new BusinessRuleException("This student has no outstanding arrears to clear.");

        // Create a single WrittenOff payment covering the outstanding balance
        // This does NOT affect income reports (WrittenOff is excluded from revenue)
        var activeYear = await _db.AcademicYear.AsNoTracking()
            .OrderByDescending(a => a.Year)
            .FirstOrDefaultAsync()
            ?? throw new BusinessRuleException("No academic year found.");

        var activeTerm = await _db.Term.AsNoTracking()
            .Where(t => t.IsActive)
            .FirstOrDefaultAsync()
            ?? await _db.Term.AsNoTracking()
                .OrderByDescending(t => t.Id)
                .FirstOrDefaultAsync()
            ?? throw new BusinessRuleException("No term found.");

        var cashMethod = await _db.PaymentMethod.AsNoTracking()
            .FirstOrDefaultAsync(m => m.Code == "CASH")
            ?? throw new BusinessRuleException("No payment method found.");

        var writeOffPayment = new Payment
        {
            StudentId       = studentId,
            TermId          = activeTerm.Id,
            AcademicYearId  = activeYear.Id,
            PaymentMethodId = cashMethod.Id,
            AmountPaid      = balance,
            AmountUsd       = balance,
            Currency        = "USD",
            Notes           = $"ARREAR WRITE-OFF: {request.Reason}" +
                              (request.Notes is not null ? $" — {request.Notes}" : ""),
            Status          = PaymentStatus.WrittenOff,
            PaymentDate     = DateTime.UtcNow,
            RecordedById    = _currentUser.UserId,
        };

        _db.Payment.Add(writeOffPayment);
        await _db.SaveChangesAsync();

        // Add a breakdown line so balance computation picks it up
        _db.PaymentBreakdown.Add(new PaymentBreakdown
        {
            PaymentId   = writeOffPayment.Id,
            ItemType    = PaymentItemType.Tuition,
            Label       = "Arrear write-off",
            AmountDue   = balance,
            AmountPaid  = balance,
            MonthStatus = MonthPaymentStatus.Paid,
        });

        await _db.SaveChangesAsync();

        await _audit.LogAsync("CLEAR_ARREARS", "Payment", writeOffPayment.Id.ToString(),
            newValues: new
            {
                studentId,
                StudentName = $"{student.FirstName} {student.Surname}",
                AmountWrittenOff = balance,
                request.Reason,
                request.Notes
            });
    }
}