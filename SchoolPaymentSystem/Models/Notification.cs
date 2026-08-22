using SchoolPaymentSystem.Models.user;

namespace SchoolPaymentSystem.Models;

public class Notification
{
    public int      Id         { get; set; }
    public string   UserId     { get; set; } = string.Empty;   // target ApplicationUser.Id
    public string   Title      { get; set; } = string.Empty;
    public string   Message    { get; set; } = string.Empty;
    public string   Type       { get; set; } = "Info";         // "Info" | "Warning" | "Alert"
    public string?  EntityName { get; set; }                   // e.g. "Payment"
    public string?  EntityId   { get; set; }                   // e.g. "42"
    public bool     IsRead     { get; set; } = false;
    public DateTime CreatedAt  { get; set; } = DateTime.Now;
    public DateTime? ReadAt    { get; set; }

    // ── Navigation ──────────────────────────────────────────────────────────
    public ApplicationUser User { get; set; } = null!;
}