using SchoolPaymentSystem.DTO.Payment;

namespace SchoolPaymentSystem.Services.Interfaces;

public interface ITransferService
{
    /// <summary>
    /// Returns a list of paid credits that can be transferred for a student.
    /// Each item shows the service, the payment that funded it, and how much
    /// is available to move.
    /// </summary>
    Task<List<TransferableCredit>> GetTransferableCreditsAsync(int studentId, int academicYearId, int termId);

    /// <summary>
    /// Moves a dollar amount from one paid service to another.
    /// Creates the destination fee record, reduces the source record,
    /// and logs the transfer in SurplusTransfer.
    /// </summary>
    Task<StandaloneTransferResult> TransferCreditAsync(StandaloneTransferRequest request);
}
