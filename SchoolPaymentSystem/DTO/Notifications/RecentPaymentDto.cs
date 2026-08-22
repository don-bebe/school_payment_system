namespace SchoolPaymentSystem.DTO.Notifications;

public record RecentPaymentDto(
    int      Id,
    string   StudentName,
    string   StudentNumber,
    decimal  Amount,
    string   Currency,
    string   Method,
    string   MethodCode,
    string?  PrepaymentDescription,
    DateTime PaidAt,
    string   ReceiptNumber
    );