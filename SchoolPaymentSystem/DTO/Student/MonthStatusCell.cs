namespace SchoolPaymentSystem.DTO.Student;

public record MonthStatusCell(
    string MonthName,
    decimal AmountDue,
    decimal AmountPaid,
    decimal Balance,
    string  Status   // "Paid" | "Partial" | "Unpaid"
    );