namespace SchoolPaymentSystem.DTO.Payment;

public record ReceiptDto(
    int      Id,
    string   ReceiptNumber,
    string   StudentName,
    string   StudentNumber,
    string   GradeName,
    string   TermName,
    string   AcademicYear,
    decimal  AmountPaid,
    decimal  AmountUsd,
    decimal? ZigRateUsed,
    string   Currency,
    string   PaymentMethod,
    string   PaymentMethodCode,
    string?  Reference,
    string?  PrepaymentDescription,
    bool     IsPrepayment,
    DateTime PaymentDate,
    DateTime IssuedAt,
    string   IssuedByName,
    /// <summary>
    /// Base64 data URI of the issuing staff member's signature image,
    /// or null if they have not uploaded one yet.
    /// </summary>
    string?  IssuedBySignature,
    bool     IsPrinted,
    List<PaymentBreakdownDto> Breakdown,
    List<UniformReceiptLine>  UniformLines
);

/// <summary>Individual uniform item line shown on a receipt.</summary>
public record UniformReceiptLine(
    string  ItemName,
    int     Quantity,
    decimal UnitPrice,
    decimal TotalPrice
);