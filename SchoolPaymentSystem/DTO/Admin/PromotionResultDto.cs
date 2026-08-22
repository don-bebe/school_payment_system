namespace SchoolPaymentSystem.DTO.Admin;

public record PromotionResultDto(
    int  PromotedCount,
    int  SkippedCount,
    List<string> Errors
    );