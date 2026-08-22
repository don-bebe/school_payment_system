namespace SchoolPaymentSystem.DTO.Reports;

public record ExpensesByCategoryDto(
    string  CategoryName,
    string  Currency,
    decimal Total,
    decimal TotalUsd,
    int     Count
    );