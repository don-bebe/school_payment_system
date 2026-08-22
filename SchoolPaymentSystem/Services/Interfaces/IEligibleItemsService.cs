using SchoolPaymentSystem.DTO.Payment;

namespace SchoolPaymentSystem.Services.Interfaces;

public interface IEligibleItemsService
{
    /// <summary>
    /// Returns all fee items eligible for payment by this student in the active term.
    /// Applies grade-specific rules (registration, project fee), enrollment-date
    /// rules (admission, report book), and checks which items are already paid.
    /// </summary>
    Task<EligibleItemsResponse> GetEligibleItemsAsync(
        int studentId, int termId, int academicYearId);
}
