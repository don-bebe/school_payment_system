using SchoolPaymentSystem.DTO.Payment;

namespace SchoolPaymentSystem.Services.Interfaces;

public interface IPaymentOrchestrator
{
    /// <summary>
    /// Orchestrates a full payment:
    ///   1. Resolves effective fee rates (staff child / sibling rule)
    ///   2. Allocates amount across selected items in priority order
    ///   3. Persists Payment + all breakdown rows + all standalone payment records
    ///   4. Generates receipt
    ///   5. Writes audit log
    /// </summary>
    Task<PaymentDto> ProcessPaymentAsync(CreatePaymentRequest request);
    Task<PaymentDto> ProcessArrearsPaymentAsync(PayArrearsRequest request);
}
