using SchoolPaymentSystem.DTO.Fees;
using SchoolPaymentSystem.DTO.Grade;

namespace SchoolPaymentSystem.Services.Interfaces;

public interface IAcademicService
{
    // Grades
    Task<GradeDto>           CreateGradeAsync(CreateGradeRequest request);
    Task<GradeDto>           UpdateGradeAsync(int id, UpdateGradeRequest request);
    Task<List<GradeDto>>     GetAllGradesAsync();

    // Academic Years
    Task<AcademicYearDto>        CreateAcademicYearAsync(CreateAcademicYearRequest request);
    Task                         SetActiveYearAsync(int id);
    Task<AcademicYearDto>        GetActiveYearAsync();
    Task<List<AcademicYearDto>>  GetAllYearsAsync();

    // Terms
    Task<TermDto>            CreateTermAsync(CreateTermRequest request);
    Task<TermDto>            UpdateTermAsync(int id, UpdateTermRequest request);
    Task                     SetActiveTermAsync(int id);
    Task<TermDto>            GetActiveTermAsync();
    Task<List<TermDto>>      GetTermsByYearAsync(int academicYearId);

    // Term Fees
    Task<TermFeeDto>         SetTermFeeAsync(SetTermFeeRequest request);
    Task<List<TermFeeDto>>   GetTermFeesAsync(int termId);
    Task<decimal>            GetTermFeeForStudentAsync(int studentId, int termId, int academicYearId);

    // ── Per-month tuition overrides ───────────────────────────────────────────
    Task<TermFeeDto>         SetTermMonthFeeAsync(SetTermMonthFeeRequest request);
    Task<TermFeeDto>         DeleteTermMonthFeeAsync(int termFeeId, int termMonthId);

    // ── Term Extension Months ─────────────────────────────────────────────────
    Task<List<TermExtensionMonthDto>> GetExtensionMonthsAsync(int termId);
    Task<TermExtensionMonthDto>       AddExtensionMonthAsync(AddTermExtensionMonthRequest request);
    Task                              RemoveExtensionMonthAsync(int extensionMonthId);
    Task<TermExtensionMonthDto>       SetExtensionFeeAsync(SetExtensionFeeRequest request);
    Task<TermExtensionMonthDto>       RemoveExtensionFeeAsync(int extensionMonthId, int gradeId);
    Task                              ToggleExtensionMonthAsync(int extensionMonthId, bool isActive);
}