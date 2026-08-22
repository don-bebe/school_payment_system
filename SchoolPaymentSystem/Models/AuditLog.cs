using SchoolPaymentSystem.Models.user;

namespace SchoolPaymentSystem.Models;

public class AuditLog
{
    public long     Id          { get; set; }   // long for high-volume tables
    public string?   UserId      { get; set; } = string.Empty;   // ApplicationUser.Id
    public string   UserName    { get; set; } = string.Empty;   // snapshot at time of action
    public string   Action      { get; set; } = string.Empty;   // "CREATE_PAYMENT", "DELETE_STUDENT" …
    public string   EntityName  { get; set; } = string.Empty;   // "Payment", "Student"
    public string?  EntityId    { get; set; }                   // PK of affected record
    public string?  OldValues   { get; set; }                   // JSON snapshot before change
    public string?  NewValues   { get; set; }                   // JSON snapshot after change
    public string?  IpAddress   { get; set; }
    public DateTime Timestamp   { get; set; } = DateTime.Now;
    public bool     Success     { get; set; } = true;
    public string?  ErrorMessage { get; set; }

    // ── Navigation ──────────────────────────────────────────────────────────
    public ApplicationUser? User { get; set; }
}