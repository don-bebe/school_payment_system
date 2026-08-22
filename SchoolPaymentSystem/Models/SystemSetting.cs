using SchoolPaymentSystem.Models.user;

namespace SchoolPaymentSystem.Models;

public class SystemSetting
{
    public int     Id          { get; set; }
    public string  Key         { get; set; } = string.Empty;
    public string  Value       { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string  DataType    { get; set; } = "string";  // string | int | decimal | bool
    public DateTime UpdatedAt  { get; set; } = DateTime.Now;
    public string  UpdatedById { get; set; } = string.Empty;

    // ── Navigation ──────────────────────────────────────────────────────────
    public ApplicationUser UpdatedBy { get; set; } = null!;
}