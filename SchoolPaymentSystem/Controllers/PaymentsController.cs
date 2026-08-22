using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolPaymentSystem.DTO.Payment;
using SchoolPaymentSystem.Helpers;
using SchoolPaymentSystem.Services.Interfaces;

namespace SchoolPaymentSystem.Controllers;

[Authorize]
public class PaymentsController : BaseController
{
    private readonly IPaymentService       _payments;
    private readonly IPaymentOrchestrator  _orchestrator;
    private readonly IEligibleItemsService _eligible;
    private readonly IZigRateService       _zigRate;

    public PaymentsController(
        IPaymentService      payments,
        IPaymentOrchestrator orchestrator,
        IEligibleItemsService eligible,
        IZigRateService       zigRate)
    {
        _payments     = payments;
        _orchestrator = orchestrator;
        _eligible     = eligible;
        _zigRate      = zigRate;
    }

    // ── POST /api/payments ────────────────────────────────────────────────────
    /// <summary>
    /// Record a fee payment for a student.
    /// When SelectedItems is provided the PaymentOrchestrator allocates the
    /// amount across all chosen fee types in priority order.
    /// When SelectedItems is empty the system falls back to tuition-only splitting.
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "AdminOrReception")]
    [ProducesResponseType(typeof(PaymentDto), 201)]
    [ProducesResponseType(400)]
    [ProducesResponseType(422)]
    public async Task<IActionResult> Create([FromBody] CreatePaymentRequest request)
    {
        var payment = await _orchestrator.ProcessPaymentAsync(request);
        return Created(payment, "Payment recorded successfully.");
    }

    // ── POST /api/payments/arrears ───────────────────────────────────────────────
    /// <summary>
    /// Record a manual payment against a student's previous-term arrears.
    /// Creates a payment with itemType=Arrears so it appears on the receipt
    /// and is deducted from the arrears balance in the grade view.
    /// </summary>
    [HttpPost("arrears")]
    [Authorize(Policy = "AdminOrReception")]
    [ProducesResponseType(typeof(PaymentDto), 201)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> PayArrears([FromBody] PayArrearsRequest request)
    {
        var payment = await _orchestrator.ProcessArrearsPaymentAsync(request);
        return Created(payment, "Arrears payment recorded successfully.");
    }

    // ── GET /api/payments/eligible-items ─────────────────────────────────────
    /// <summary>
    /// Returns all fee items that this student is eligible to pay in the given term,
    /// with amounts and paid/unpaid status. Drives the payment UI checkbox panel.
    /// </summary>
    [HttpGet("eligible-items")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(EligibleItemsResponse), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetEligibleItems(
        [FromQuery] int studentId,
        [FromQuery] int termId,
        [FromQuery] int academicYearId)
    {
        var items = await _eligible.GetEligibleItemsAsync(studentId, termId, academicYearId);
        return Ok(items);
    }

    // ── GET /api/payments/{id} ────────────────────────────────────────────────
    /// <summary>Retrieve a single payment with its full itemised breakdown.</summary>
    [HttpGet("{id:int}")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(PaymentDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetById(int id)
    {
        var payment = await _payments.GetByIdAsync(id);
        return Ok(payment);
    }

    // ── GET /api/payments/student/{studentId} ─────────────────────────────────
    /// <summary>
    /// List all payments for a student across all terms.
    /// Filter by termId and/or academicYearId via query string.
    /// </summary>
    [HttpGet("student/{studentId:int}")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(List<PaymentDto>), 200)]
    public async Task<IActionResult> GetByStudent(
        int studentId,
        [FromQuery] int? termId         = null,
        [FromQuery] int? academicYearId = null)
    {
        var payments = await _payments.GetByStudentAsync(studentId, termId, academicYearId);
        return Ok(payments);
    }

    // ── GET /api/payments/{id}/receipt ────────────────────────────────────────
    /// <summary>
    /// Retrieve the receipt data for a payment.
    /// The frontend uses this to render the printable receipt.
    /// </summary>
    [HttpGet("{id:int}/receipt")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(ReceiptDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetReceipt(int id)
    {
        var receipt = await _payments.GetReceiptAsync(id);
        return Ok(receipt);
    }

    // ── GET /api/payments/receipts/{receiptNumber} ────────────────────────────
    /// <summary>Look up a receipt by its printed number (e.g. RCP-2026-00042).</summary>
    [HttpGet("receipts/{receiptNumber}")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(ReceiptDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetReceiptByNumber(string receiptNumber)
    {
        var receipt = await _payments.GetReceiptByNumberAsync(receiptNumber);
        return Ok(receipt);
    }

    // ── PUT /api/payments/{id}/mark-printed ───────────────────────────────────
    /// <summary>
    /// Called by the frontend after the receipt is sent to the printer.
    /// Sets IsPrinted = true and records the PrintedAt timestamp.
    /// </summary>
    [HttpPut("{id:int}/mark-printed")]
    [Authorize(Policy = "AdminOrReception")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> MarkPrinted(int id)
    {
        await _payments.MarkReceiptPrintedAsync(id);
        return NoContent("Receipt marked as printed.");
    }

    // ── PUT /api/payments/{id} ────────────────────────────────────────────────
    /// <summary>
    /// Correct the breakdown allocation of an existing completed payment.
    /// Useful when money was recorded against the wrong fee type by mistake.
    /// The total AmountPaid on the payment is NOT changed; only how the amount
    /// is split across fee types is corrected.  All downstream records (standalone
    /// fee tables, receipt) are updated automatically.
    /// Admin only — financial corrections are a sensitive operation.
    /// </summary>
    [HttpPut("{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(PaymentDto), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Edit(int id, [FromBody] UpdatePaymentRequest request)
    {
        var payment = await _payments.EditPaymentAsync(id, request);
        return Ok(payment);
    }

    // ── POST /api/payments/reverse ────────────────────────────────────────────
    /// <summary>
    /// Reverse (void) a payment. Reversal restores all fee records so the student's
    /// balances return to what they were before the payment. Admin only.
    /// </summary>
    [HttpPost("reverse")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Reverse([FromBody] ReversePaymentRequest request)
    {
        await _payments.ReversePaymentAsync(request);
        return NoContent("Payment reversed.");
    }

    // ── DELETE /api/payments/{id} ─────────────────────────────────────────────
    /// <summary>
    /// Hard-delete a payment record, restoring all fee balances it covered.
    /// Use this when a payment was entered incorrectly and must be fully removed.
    /// All breakdown lines, standalone fee records, and the receipt are deleted.
    /// Admin only — this is an irreversible financial operation.
    /// </summary>
    [HttpDelete("{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(204)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Delete(int id, [FromQuery] string? reason = null)
    {
        await _payments.DeletePaymentAsync(id, reason);
        return NoContent("Payment deleted and balances restored.");
    }

    // ── GET /api/payments/methods ─────────────────────────────────────────────
    /// <summary>List all active payment methods (Cash, EcoCash) with metadata.</summary>
    [HttpGet("methods")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(List<PaymentMethodDto>), 200)]
    public async Task<IActionResult> GetMethods()
    {
        var methods = await _payments.GetPaymentMethodsAsync();
        return Ok(methods);
    }

    // ── GET /api/payments/zig-rate ────────────────────────────────────────────
    /// <summary>
    /// Returns the current ZiG/USD exchange rate. Accessible to all staff
    /// (Receptionist needs this to accept ZiG payments on the payment screen).
    /// </summary>
    [HttpGet("zig-rate")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetCurrentZigRate()
    {
        var rate = await _zigRate.GetCurrentRateAsync();
        if (rate is null)
            return NotFound(ApiResponse.Fail("No ZiG rate has been configured yet."));
        return Ok(rate);
    }
}
