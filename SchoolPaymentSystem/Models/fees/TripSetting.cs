using SchoolPaymentSystem.Models.term;

namespace SchoolPaymentSystem.Models.fees;

/// <summary>
/// An admin-created trip associated with a term.
/// Admin creates a trip (name + amount), students can pay for it.
/// Admin deactivates the trip when collection closes.
/// </summary>
public class TripSetting
{
    public int     Id       { get; set; }
    public int     TermId   { get; set; }
    public string  Name     { get; set; } = string.Empty;   // e.g. "Science Museum Trip"
    public decimal Amount   { get; set; }
    public bool    IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // ── Navigation ──────────────────────────────────────────────────────────
    public Term Term { get; set; } = null!;
    public ICollection<TripPaymentRecord> PaymentRecords { get; set; } = [];
}
