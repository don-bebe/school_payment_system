namespace SchoolPaymentSystem.DTO.Payment;

public record PaymentDto(
    int      Id,
    int      StudentId,
    string   StudentName,
    string   StudentNumber,
    int      TermId,
    string   TermName,
    string   AcademicYearName,
    string   PaymentMethodName,
    string   PaymentMethodCode,

    /// <summary>Mobile-money or bank reference (EcoCash / ZiG).</summary>
    string?  Reference,

    decimal  AmountPaid,
    decimal  AmountUsd,
    decimal? ZigRateUsed,
    string   Currency,
    string?  PrepaymentDescription,
    DateTime PaymentDate,
    string   RecordedByName,
    string   Status,
    List<PaymentBreakdownDto> Breakdowns
    );