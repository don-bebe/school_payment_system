using SchoolPaymentSystem.DTO.Payment;

namespace SchoolPaymentSystem.Services.Interfaces;

public interface IPaymentService
{
    Task<PaymentDto>               CreatePaymentAsync(CreatePaymentRequest request);

    Task<PaymentDto>               GetByIdAsync(int id);
    Task<List<PaymentDto>>         GetByStudentAsync(int studentId, int? termId, int? academicYearId);
    Task<ReceiptDto>               GetReceiptAsync(int paymentId);
    Task<ReceiptDto>               GetReceiptByNumberAsync(string receiptNumber);
    Task                           MarkReceiptPrintedAsync(int paymentId);

    /// <summary>Reverses a payment (sets Status = Reversed) and logs the action.</summary>
    Task                           ReversePaymentAsync(ReversePaymentRequest request);

    /// <summary>
    /// Hard-deletes a payment, removing all breakdown lines, standalone fee records,
    /// and the receipt. Restores balances so the student can be billed again.
    /// Use this when a payment was saved with incorrect data.
    /// </summary>
    Task                           DeletePaymentAsync(int paymentId, string? reason);

    /// <summary>
    /// Corrects the breakdown allocation of an existing completed payment.
    /// The total amount on the payment record is unchanged; only how the money
    /// is distributed across fee types is updated. All downstream records
    /// (standalone fee tables, receipt) are also updated to match.
    /// </summary>
    Task<PaymentDto>               EditPaymentAsync(int paymentId, UpdatePaymentRequest request);

    Task<List<PaymentMethodDto>>   GetPaymentMethodsAsync();
}