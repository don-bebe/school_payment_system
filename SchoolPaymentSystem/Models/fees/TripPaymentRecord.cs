using SchoolPaymentSystem.Models.payment;
using SchoolPaymentSystem.Models.user;

namespace SchoolPaymentSystem.Models.fees;

/// <summary>
/// Records a student's payment for a specific trip.
/// One record per student per trip — a student can only pay for a trip once.
/// </summary>
public class TripPaymentRecord
{
    public int     Id             { get; set; }
    public int     StudentId      { get; set; }
    public int     TripSettingId  { get; set; }
    public int     PaymentId      { get; set; }
    public decimal AmountPaid     { get; set; }
    public DateTime PaidAt        { get; set; } = DateTime.UtcNow;

    // ── Navigation ──────────────────────────────────────────────────────────
    public Student     Student     { get; set; } = null!;
    public TripSetting TripSetting { get; set; } = null!;
    public Payment     Payment     { get; set; } = null!;
}
