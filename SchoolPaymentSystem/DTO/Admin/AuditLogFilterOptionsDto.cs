namespace SchoolPaymentSystem.DTO.Admin;

public record AuditLogFilterOptionsDto(
    List<string> Actions,
    List<string> Entities
);
