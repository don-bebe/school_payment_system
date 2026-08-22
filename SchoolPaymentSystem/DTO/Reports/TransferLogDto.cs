namespace SchoolPaymentSystem.DTO.Reports;

public record TransferLogDto(
    int      Id,
    string   StudentName,
    string   StudentNumber,
    int      PaymentId,
    string   TargetItemType,
    decimal  Amount,
    string?  Reason,
    DateTime TransferredAt,
    string   TransferredByName
);
