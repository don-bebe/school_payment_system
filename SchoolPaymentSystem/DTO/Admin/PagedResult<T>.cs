namespace SchoolPaymentSystem.DTO.Admin;

public record PagedResult<T>(
    List<T> Items,
    int     TotalCount,
    int     Page,
    int     PageSize,
    int     TotalPages
    );