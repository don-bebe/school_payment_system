using SchoolPaymentSystem.DTO.Fees;
using SchoolPaymentSystem.DTO.Student;
using SchoolPaymentSystem.Models.fees;

namespace SchoolPaymentSystem.Services.Interfaces;

public interface IFeeRuleService
{
    /// <summary>
    /// Returns the fully resolved tuition and sports levy amounts for a student
    /// in a given term, applying staff-child rates, sibling rule, or custom overrides.
    /// Also returns per-month tuition breakdown with already-paid amounts.
    /// </summary>
    Task<EffectiveFeeDto> GetEffectiveFeeAsync(int studentId, int termId, int academicYearId);

    /// <summary>
    /// Returns true if the student qualifies for staff-child rates — either because
    /// IsStaffChild is set, the sibling rule applies, or a StudentFeeOverride forces it.
    /// </summary>
    Task<bool> IsEffectiveStaffChildAsync(int studentId, int academicYearId);

    /// <summary>
    /// Returns all active enrolled students in the given guardian group for the
    /// given academic year. Used to display sibling group on student profile.
    /// </summary>
    Task<List<SiblingDto>> GetSiblingGroupAsync(int groupId, int academicYearId);

    /// <summary>
    /// Finds active enrolled students whose guardian phone matches the given
    /// number (normalised — spaces and dashes ignored). Used to auto-suggest
    /// a group ID when enrolling a new sibling.
    /// </summary>
    Task<List<SiblingDto>> FindByGuardianPhoneAsync(string phone, int academicYearId);

    /// <summary>
    /// Creates or updates a custom fee override for a student.
    /// Used for: fixed partial rates (e.g. $25/month), sports-achievement monthly discounts,
    /// and manual sibling discount reassignment.
    /// </summary>
    Task<StudentFeeOverride> UpsertFeeOverrideAsync(
        int studentId, int academicYearId, int? termMonthId,
        decimal? overrideTuitionAmount, bool forceStaffChildRate,
        string reason, string createdById);

    /// <summary>Returns all active overrides for a student in a year.</summary>
    Task<List<StudentFeeOverride>> GetFeeOverridesAsync(int studentId, int academicYearId);

    /// <summary>Deactivates a specific override.</summary>
    Task DeleteFeeOverrideAsync(int overrideId);
}
