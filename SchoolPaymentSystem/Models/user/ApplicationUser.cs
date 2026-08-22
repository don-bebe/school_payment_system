using Microsoft.AspNetCore.Identity;
using SchoolPaymentSystem.Models.expenses;
using SchoolPaymentSystem.Models.payment;

namespace SchoolPaymentSystem.Models.user;

public class ApplicationUser : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName  { get; set; } = string.Empty;
    
    public string Role { get; set; } = string.Empty;

    public bool   IsActive    { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public DateTime? LastLogin { get; set; }

    /// <summary>
    /// Base64-encoded signature image used on printed receipts.
    /// Stored as a data URI string (e.g. "data:image/png;base64,...").
    /// Null if the user has not uploaded a signature yet.
    /// </summary>
    public string? SignatureImageBase64 { get; set; }

    // ── Navigation ──────────────────────────────────────────────────────────
    public ICollection<Payment>  Payments  { get; set; } = [];
    public ICollection<Expense>  Expenses  { get; set; } = [];
    public ICollection<AuditLog> AuditLogs { get; set; } = [];
}