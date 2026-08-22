using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SchoolPaymentSystem.Models;
using SchoolPaymentSystem.Models.expenses;
using SchoolPaymentSystem.Models.fees;
using SchoolPaymentSystem.Models.grade;
using SchoolPaymentSystem.Models.payment;
using SchoolPaymentSystem.Models.term;
using SchoolPaymentSystem.Models.user;

namespace SchoolPaymentSystem.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options) { }

    // ── Core domain tables ───────────────────────────────────────────────────
    public DbSet<Grade> Grade { get; set; }
    public DbSet<AcademicYear> AcademicYear { get; set; }
    public DbSet<Term> Term { get; set; }
    public DbSet<TermMonth> TermMonth { get; set; }
    public DbSet<TermFee> TermFee { get; set; }
    public DbSet<TermMonthFee> TermMonthFee { get; set; }
    public DbSet<TermCustomFee> TermCustomFee { get; set; }
    public DbSet<TermExtensionMonth> TermExtensionMonth { get; set; }
    public DbSet<TermExtensionFee> TermExtensionFee { get; set; }
    public DbSet<Student> Student { get; set; }
    public DbSet<StudentGradeHistory> StudentGradeHistory { get; set; }
    public DbSet<PaymentMethod> PaymentMethod { get; set; }
    public DbSet<Payment> Payment { get; set; }
    public DbSet<PaymentBreakdown> PaymentBreakdown { get; set; }
    public DbSet<Receipt> Receipt { get; set; }
    public DbSet<ZigRate> ZigRate { get; set; }
    public DbSet<ExpenseCategory> ExpenseCategory { get; set; }
    public DbSet<Expense> Expense { get; set; }
    public DbSet<AuditLog> AuditLog { get; set; }
    public DbSet<SystemSetting> SystemSetting { get; set; }
    public DbSet<Notification> Notification { get; set; }

    // ── Standalone fee config tables ─────────────────────────────────────────
    public DbSet<RegistrationFeeSetting> RegistrationFeeSetting { get; set; }
    public DbSet<ReportBookSetting> ReportBookSetting { get; set; }
    public DbSet<AdmissionFeeSetting> AdmissionFeeSetting { get; set; }
    public DbSet<TransportFeeSetting> TransportFeeSetting { get; set; }
    public DbSet<ProjectFeeSetting> ProjectFeeSetting { get; set; }
    public DbSet<UniformItem> UniformItem { get; set; }
    public DbSet<TripSetting> TripSetting { get; set; }

    // ── Standalone fee payment record tables ─────────────────────────────────
    public DbSet<RegistrationFeePayment> RegistrationFeePayment { get; set; }
    public DbSet<ReportBookPayment> ReportBookPayment { get; set; }
    public DbSet<AdmissionFeePayment> AdmissionFeePayment { get; set; }
    public DbSet<TransportFeePayment> TransportFeePayment { get; set; }
    public DbSet<TripPaymentRecord> TripPaymentRecord { get; set; }
    public DbSet<ProjectFeePayment> ProjectFeePayment { get; set; }
    public DbSet<UniformPurchaseLine> UniformPurchaseLine { get; set; }
    public DbSet<SurplusTransfer> SurplusTransfer { get; set; }
    public DbSet<StudentFeeOverride> StudentFeeOverride { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // ── Grade ────────────────────────────────────────────────────────────
        builder.Entity<Grade>(e =>
        {
            e.HasKey(g => g.Id);
            e.HasIndex(g => g.Level).IsUnique();
            e.Property(g => g.Name).HasMaxLength(50).IsRequired();
        });

        // ── AcademicYear ─────────────────────────────────────────────────────
        builder.Entity<AcademicYear>(e =>
        {
            e.HasKey(a => a.Id);
            e.HasIndex(a => a.Year).IsUnique();
        });

        // ── Term ─────────────────────────────────────────────────────────────
        builder.Entity<Term>(e =>
        {
            e.HasKey(t => t.Id);
            e.HasOne(t => t.AcademicYear)
                .WithMany(a => a.Terms)
                .HasForeignKey(t => t.AcademicYearId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(t => new { t.AcademicYearId, t.TermNumber }).IsUnique();
        });

        // ── TermMonth ────────────────────────────────────────────────────────
        builder.Entity<TermMonth>(e =>
        {
            e.HasKey(tm => tm.Id);
            e.HasOne(tm => tm.Term)
                .WithMany(t => t.TermMonths)
                .HasForeignKey(tm => tm.TermId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(tm => new { tm.TermId, tm.MonthNumber }).IsUnique();
        });

        // ── TermFee ──────────────────────────────────────────────────────────
        builder.Entity<TermFee>(e =>
        {
            e.HasKey(tf => tf.Id);
            e.HasOne(tf => tf.Term)
                .WithMany(t => t.TermFees)
                .HasForeignKey(tf => tf.TermId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(tf => tf.Grade)
                .WithMany(g => g.TermFees)
                .HasForeignKey(tf => tf.GradeId)
                .OnDelete(DeleteBehavior.Restrict);

            e.Property(tf => tf.TuitionAmount).HasColumnType("decimal(18,2)");
            e.Property(tf => tf.SportsLevyAmount).HasColumnType("decimal(18,2)");
            e.Property(tf => tf.StaffChildTuitionAmount).HasColumnType("decimal(18,2)");
            e.Property(tf => tf.StaffChildSportsLevyAmount).HasColumnType("decimal(18,2)");
            e.HasIndex(tf => new { tf.TermId, tf.GradeId }).IsUnique();
        });

        // ── TermMonthFee ─────────────────────────────────────────────────────
        builder.Entity<TermMonthFee>(e =>
        {
            e.HasKey(tmf => tmf.Id);
            e.HasOne(tmf => tmf.TermFee)
                .WithMany(tf => tf.MonthFees)
                .HasForeignKey(tmf => tmf.TermFeeId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(tmf => tmf.TermMonth)
                .WithMany()
                .HasForeignKey(tmf => tmf.TermMonthId)
                .OnDelete(DeleteBehavior.Cascade);
            e.Property(tmf => tmf.OverrideAmount).HasColumnType("decimal(18,2)");
            // One override per term-fee / month combination
            e.HasIndex(tmf => new { tmf.TermFeeId, tmf.TermMonthId }).IsUnique();
        });

        // ── TermExtensionMonth ───────────────────────────────────────────────
        builder.Entity<TermExtensionMonth>(e =>
        {
            e.HasKey(em => em.Id);
            e.HasOne(em => em.Term)
                .WithMany(t => t.ExtensionMonths)
                .HasForeignKey(em => em.TermId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(em => new { em.TermId, em.MonthNumber }).IsUnique();
        });

        // ── TermExtensionFee ─────────────────────────────────────────────────
        builder.Entity<TermExtensionFee>(e =>
        {
            e.HasKey(ef => ef.Id);
            e.HasOne(ef => ef.TermExtensionMonth)
                .WithMany(em => em.ExtensionFees)
                .HasForeignKey(ef => ef.TermExtensionMonthId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(ef => ef.Grade)
                .WithMany()
                .HasForeignKey(ef => ef.GradeId)
                .OnDelete(DeleteBehavior.Restrict);
            e.Property(ef => ef.Amount).HasColumnType("decimal(18,2)");
            e.HasIndex(ef => new { ef.TermExtensionMonthId, ef.GradeId }).IsUnique();
        });

        // ── TermCustomFee ────────────────────────────────────────────────────
        builder.Entity<TermCustomFee>(e =>
        {
            e.HasKey(tc => tc.Id);
            e.HasOne(tc => tc.TermFee)
                .WithMany(tf => tf.CustomFees)
                .HasForeignKey(tc => tc.TermFeeId)
                .OnDelete(DeleteBehavior.Cascade);

            e.Property(tc => tc.Name).HasMaxLength(100).IsRequired();
            e.Property(tc => tc.Amount).HasColumnType("decimal(18,2)");
            e.Property(tc => tc.ApplicableTermMonthIds).HasMaxLength(500);
        });

        // ── Student ──────────────────────────────────────────────────────────
        builder.Entity<Student>(e =>
        {
            e.HasKey(s => s.Id);
            e.HasIndex(s => s.StudentNumber).IsUnique();
            e.Property(s => s.StudentNumber).HasMaxLength(20).IsRequired();
            e.Property(s => s.FirstName).HasMaxLength(100).IsRequired();
            e.Property(s => s.Surname).HasMaxLength(100).IsRequired();
            e.Property(s => s.GuardianPhone).HasMaxLength(20);
            e.Property(s => s.DeactivationNotes).HasMaxLength(500);

            // Enum stored as int (default) — matches migration
            e.Property(s => s.DeactivationReason).HasConversion<int>();
        });

        // ── StudentGradeHistory ──────────────────────────────────────────────
        builder.Entity<StudentGradeHistory>(e =>
        {
            e.HasKey(sgh => sgh.Id);

            e.HasOne(sgh => sgh.Student)
                .WithMany(s => s.GradeHistories)
                .HasForeignKey(sgh => sgh.StudentId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(sgh => sgh.Grade)
                .WithMany(g => g.StudentGradeHistories)
                .HasForeignKey(sgh => sgh.GradeId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(sgh => sgh.AcademicYear)
                .WithMany(a => a.StudentGradeHistories)
                .HasForeignKey(sgh => sgh.AcademicYearId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(sgh => sgh.StartingTermMonth)
                .WithMany()
                .HasForeignKey(sgh => sgh.StartingTermMonthId)
                .OnDelete(DeleteBehavior.SetNull)
                .IsRequired(false);

            e.HasIndex(sgh => new { sgh.StudentId, sgh.AcademicYearId }).IsUnique();
        });

        // ── PaymentMethod ────────────────────────────────────────────────────
        builder.Entity<PaymentMethod>(e =>
        {
            e.HasKey(pm => pm.Id);
            e.HasIndex(pm => pm.Code).IsUnique();
            e.Property(pm => pm.Code).HasMaxLength(20).IsRequired();
            e.Property(pm => pm.Name).HasMaxLength(50).IsRequired();
        });

        // ── Payment ──────────────────────────────────────────────────────────
        builder.Entity<Payment>(e =>
        {
            e.HasKey(p => p.Id);

            e.HasOne(p => p.Student)
                .WithMany(s => s.Payments)
                .HasForeignKey(p => p.StudentId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(p => p.Term)
                .WithMany(t => t.Payments)
                .HasForeignKey(p => p.TermId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(p => p.AcademicYear)
                .WithMany(a => a.Payments)
                .HasForeignKey(p => p.AcademicYearId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(p => p.PaymentMethod)
                .WithMany(pm => pm.Payments)
                .HasForeignKey(p => p.PaymentMethodId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(p => p.RecordedBy)
                .WithMany(u => u.Payments)
                .HasForeignKey(p => p.RecordedById)
                .OnDelete(DeleteBehavior.Restrict);

            e.Property(p => p.AmountPaid).HasColumnType("decimal(18,2)");
            e.Property(p => p.AmountUsd).HasColumnType("decimal(18,2)");
            e.Property(p => p.ZigRateUsed).HasColumnType("decimal(18,4)");
            e.Property(p => p.Reference).HasMaxLength(100);
            e.Property(p => p.Currency).HasMaxLength(5);

            e.HasOne(p => p.Receipt)
                .WithOne(r => r.Payment)
                .HasForeignKey<Receipt>(r => r.PaymentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── PaymentBreakdown ─────────────────────────────────────────────────
        builder.Entity<PaymentBreakdown>(e =>
        {
            e.HasKey(pb => pb.Id);

            e.HasOne(pb => pb.Payment)
                .WithMany(p => p.Breakdowns)
                .HasForeignKey(pb => pb.PaymentId)
                .OnDelete(DeleteBehavior.Cascade);

            // TermMonthId is now nullable (standalone fee lines have no month)
            e.HasOne(pb => pb.TermMonth)
                .WithMany(tm => tm.PaymentBreakdowns)
                .HasForeignKey(pb => pb.TermMonthId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired(false);

            e.Property(pb => pb.AmountDue).HasColumnType("decimal(18,2)");
            e.Property(pb => pb.AmountPaid).HasColumnType("decimal(18,2)");
            e.Property(pb => pb.Label).HasMaxLength(150);
            e.Property(pb => pb.ItemType).HasConversion<int>();

            e.Ignore(pb => pb.Balance);
        });

        // ── Receipt ──────────────────────────────────────────────────────────
        builder.Entity<Receipt>(e =>
        {
            e.HasKey(r => r.Id);
            e.HasIndex(r => r.ReceiptNumber).IsUnique();
            e.Property(r => r.ReceiptNumber).HasMaxLength(30).IsRequired();

            e.HasOne(r => r.IssuedBy)
                .WithMany()
                .HasForeignKey(r => r.IssuedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── ExpenseCategory ──────────────────────────────────────────────────
        builder.Entity<ExpenseCategory>(e =>
        {
            e.HasKey(ec => ec.Id);
            e.Property(ec => ec.Name).HasMaxLength(100).IsRequired();
        });

        // ── Expense ──────────────────────────────────────────────────────────
        builder.Entity<Expense>(e =>
        {
            e.HasKey(ex => ex.Id);

            e.HasOne(ex => ex.AcademicYear)
                .WithMany(a => a.Expenses)
                .HasForeignKey(ex => ex.AcademicYearId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(ex => ex.ExpenseCategory)
                .WithMany(ec => ec.Expenses)
                .HasForeignKey(ex => ex.ExpenseCategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(ex => ex.PaymentMethod)
                .WithMany(pm => pm.Expenses)
                .HasForeignKey(ex => ex.PaymentMethodId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(ex => ex.RecordedBy)
                .WithMany(u => u.Expenses)
                .HasForeignKey(ex => ex.RecordedById)
                .OnDelete(DeleteBehavior.Restrict);

            e.Property(ex => ex.Amount).HasColumnType("decimal(18,2)");
            e.Property(ex => ex.AmountUsd).HasColumnType("decimal(18,2)");
            e.Property(ex => ex.ZigRateUsed).HasColumnType("decimal(18,4)");
            e.Property(ex => ex.Reference).HasMaxLength(100);
            e.Property(ex => ex.Currency).HasMaxLength(5);
        });

        // ── AuditLog ─────────────────────────────────────────────────────────
        builder.Entity<AuditLog>(e =>
        {
            e.HasKey(al => al.Id);

            e.HasOne(al => al.User)
                .WithMany(u => u.AuditLogs)
                .HasForeignKey(al => al.UserId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired(false);

            e.Property(al => al.Action).HasMaxLength(100).IsRequired();
            e.Property(al => al.EntityName).HasMaxLength(100).IsRequired();
            e.Property(al => al.EntityId).HasMaxLength(50);
            e.Property(al => al.IpAddress).HasMaxLength(45);
            e.Property(al => al.UserName).HasMaxLength(100);

            e.ToTable("AuditLogs");
        });

        // ── SystemSetting ────────────────────────────────────────────────────
        builder.Entity<SystemSetting>(e =>
        {
            e.HasKey(ss => ss.Id);
            e.HasIndex(ss => ss.Key).IsUnique();
            e.Property(ss => ss.Key).HasMaxLength(100).IsRequired();

            e.HasOne(ss => ss.UpdatedBy)
                .WithMany()
                .HasForeignKey(ss => ss.UpdatedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Notification ─────────────────────────────────────────────────────
        builder.Entity<Notification>(e =>
        {
            e.HasKey(n => n.Id);
            e.HasOne(n => n.User).WithMany().HasForeignKey(n => n.UserId).OnDelete(DeleteBehavior.Cascade);
            e.Property(n => n.Title).HasMaxLength(200).IsRequired();
            e.Property(n => n.Type).HasMaxLength(20);
            e.Property(n => n.EntityName).HasMaxLength(100);
            e.Property(n => n.EntityId).HasMaxLength(50);
            e.HasIndex(n => new { n.UserId, n.IsRead });
        });

        // ── ZigRate ───────────────────────────────────────────────────────────
        builder.Entity<ZigRate>(e =>
        {
            e.HasKey(z => z.Id);
            e.Property(z => z.RatePerUsd).HasColumnType("decimal(18,4)").IsRequired();
            e.HasOne(z => z.SetBy)
                .WithMany()
                .HasForeignKey(z => z.SetById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ════════════════════════════════════════════════════════════════════
        // Standalone fee config tables
        // ════════════════════════════════════════════════════════════════════

        builder.Entity<RegistrationFeeSetting>(e =>
        {
            e.HasKey(r => r.Id);
            e.HasOne(r => r.AcademicYear)
                .WithOne(a => a.RegistrationFeeSetting)
                .HasForeignKey<RegistrationFeeSetting>(r => r.AcademicYearId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(r => r.AcademicYearId).IsUnique();
            e.Property(r => r.Amount).HasColumnType("decimal(18,2)");
        });

        builder.Entity<ReportBookSetting>(e =>
        {
            e.HasKey(r => r.Id);
            e.HasOne(r => r.AcademicYear)
                .WithOne(a => a.ReportBookSetting)
                .HasForeignKey<ReportBookSetting>(r => r.AcademicYearId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(r => r.AcademicYearId).IsUnique();
            e.Property(r => r.Amount).HasColumnType("decimal(18,2)");
        });

        builder.Entity<AdmissionFeeSetting>(e =>
        {
            e.HasKey(a => a.Id);
            e.HasOne(a => a.AcademicYear)
                .WithOne(ay => ay.AdmissionFeeSetting)
                .HasForeignKey<AdmissionFeeSetting>(a => a.AcademicYearId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(a => a.AcademicYearId).IsUnique();
            e.Property(a => a.Amount).HasColumnType("decimal(18,2)");
        });

        builder.Entity<TransportFeeSetting>(e =>
        {
            e.HasKey(t => t.Id);
            e.HasOne(t => t.AcademicYear)
                .WithOne(a => a.TransportFeeSetting)
                .HasForeignKey<TransportFeeSetting>(t => t.AcademicYearId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(t => t.AcademicYearId).IsUnique();
            e.Property(t => t.MonthlyAmount).HasColumnType("decimal(18,2)");
        });

        builder.Entity<ProjectFeeSetting>(e =>
        {
            e.HasKey(p => p.Id);
            e.HasOne(p => p.AcademicYear)
                .WithOne(a => a.ProjectFeeSetting)
                .HasForeignKey<ProjectFeeSetting>(p => p.AcademicYearId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(p => p.AcademicYearId).IsUnique();
            e.Property(p => p.Amount).HasColumnType("decimal(18,2)");
        });

        builder.Entity<UniformItem>(e =>
        {
            e.HasKey(u => u.Id);
            e.Property(u => u.Name).HasMaxLength(100).IsRequired();
            e.Property(u => u.Price).HasColumnType("decimal(18,2)");
            e.Property(u => u.Gender).HasConversion<int>();
        });

        builder.Entity<TripSetting>(e =>
        {
            e.HasKey(t => t.Id);
            e.HasOne(t => t.Term)
                .WithMany(tm => tm.TripSettings)
                .HasForeignKey(t => t.TermId)
                .OnDelete(DeleteBehavior.Cascade);
            e.Property(t => t.Name).HasMaxLength(200).IsRequired();
            e.Property(t => t.Amount).HasColumnType("decimal(18,2)");
        });

        // ════════════════════════════════════════════════════════════════════
        // Standalone fee payment record tables
        // ════════════════════════════════════════════════════════════════════

        builder.Entity<RegistrationFeePayment>(e =>
        {
            e.HasKey(r => r.Id);
            e.HasOne(r => r.Student).WithMany(s => s.RegistrationFeePayments)
                .HasForeignKey(r => r.StudentId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(r => r.AcademicYear).WithMany()
                .HasForeignKey(r => r.AcademicYearId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(r => r.Term).WithMany()
                .HasForeignKey(r => r.TermId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(r => r.Payment).WithMany(p => p.RegistrationFeePayments)
                .HasForeignKey(r => r.PaymentId).OnDelete(DeleteBehavior.Cascade);
            e.Property(r => r.AmountPaid).HasColumnType("decimal(18,2)");
            // A student may only pay registration fee once per term
            e.HasIndex(r => new { r.StudentId, r.TermId }).IsUnique();
        });

        builder.Entity<ReportBookPayment>(e =>
        {
            e.HasKey(r => r.Id);
            e.HasOne(r => r.Student).WithMany(s => s.ReportBookPayments)
                .HasForeignKey(r => r.StudentId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(r => r.AcademicYear).WithMany()
                .HasForeignKey(r => r.AcademicYearId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(r => r.Payment).WithMany(p => p.ReportBookPayments)
                .HasForeignKey(r => r.PaymentId).OnDelete(DeleteBehavior.Cascade);
            e.Property(r => r.AmountPaid).HasColumnType("decimal(18,2)");
        });

        builder.Entity<AdmissionFeePayment>(e =>
        {
            e.HasKey(a => a.Id);
            e.HasOne(a => a.Student).WithMany(s => s.AdmissionFeePayments)
                .HasForeignKey(a => a.StudentId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(a => a.AcademicYear).WithMany()
                .HasForeignKey(a => a.AcademicYearId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(a => a.Payment).WithMany(p => p.AdmissionFeePayments)
                .HasForeignKey(a => a.PaymentId).OnDelete(DeleteBehavior.Cascade);
            e.Property(a => a.AmountPaid).HasColumnType("decimal(18,2)");
            // One admission payment per student per year
            e.HasIndex(a => new { a.StudentId, a.AcademicYearId }).IsUnique();
        });

        builder.Entity<TransportFeePayment>(e =>
        {
            e.HasKey(t => t.Id);
            e.HasOne(t => t.Student).WithMany(s => s.TransportFeePayments)
                .HasForeignKey(t => t.StudentId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(t => t.TermMonth).WithMany()
                .HasForeignKey(t => t.TermMonthId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(t => t.Payment).WithMany(p => p.TransportFeePayments)
                .HasForeignKey(t => t.PaymentId).OnDelete(DeleteBehavior.Cascade);
            e.Property(t => t.AmountPaid).HasColumnType("decimal(18,2)");
            e.Property(t => t.Notes).HasMaxLength(500);
            // REMOVED: unique index on (StudentId, TermMonthId) — multiple partial payments allowed
        });

        builder.Entity<TripPaymentRecord>(e =>
        {
            e.HasKey(t => t.Id);
            e.HasOne(t => t.Student).WithMany(s => s.TripPaymentRecords)
                .HasForeignKey(t => t.StudentId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(t => t.TripSetting).WithMany(ts => ts.PaymentRecords)
                .HasForeignKey(t => t.TripSettingId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(t => t.Payment).WithMany(p => p.TripPaymentRecords)
                .HasForeignKey(t => t.PaymentId).OnDelete(DeleteBehavior.Cascade);
            e.Property(t => t.AmountPaid).HasColumnType("decimal(18,2)");
            // One trip payment per student per trip
            e.HasIndex(t => new { t.StudentId, t.TripSettingId }).IsUnique();
        });
builder.Entity<ProjectFeePayment>(e =>
{
    e.HasKey(p => p.Id);
    e.HasOne(p => p.Student).WithMany(s => s.ProjectFeePayments)
        .HasForeignKey(p => p.StudentId).OnDelete(DeleteBehavior.Restrict);
    e.HasOne(p => p.AcademicYear).WithMany()
        .HasForeignKey(p => p.AcademicYearId).OnDelete(DeleteBehavior.Restrict);
    e.HasOne(p => p.Payment).WithMany(p2 => p2.ProjectFeePayments)
        .HasForeignKey(p => p.PaymentId).OnDelete(DeleteBehavior.Cascade);
    e.Property(p => p.AmountPaid).HasColumnType("decimal(18,2)");
    // COMPLETELY REMOVE the index line - don't create any index
});

        builder.Entity<UniformPurchaseLine>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasOne(u => u.Payment).WithMany(p => p.UniformPurchaseLines)
                .HasForeignKey(u => u.PaymentId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(u => u.UniformItem).WithMany(ui => ui.PurchaseLines)
                .HasForeignKey(u => u.UniformItemId).OnDelete(DeleteBehavior.Restrict);
            e.Property(u => u.UnitPrice).HasColumnType("decimal(18,2)");
            e.Property(u => u.TotalPrice).HasColumnType("decimal(18,2)");
        });

        builder.Entity<SurplusTransfer>(e =>
        {
            e.HasKey(s => s.Id);
            e.HasOne(s => s.Payment).WithMany()
                .HasForeignKey(s => s.PaymentId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(s => s.TransferredBy).WithMany()
                .HasForeignKey(s => s.TransferredById).OnDelete(DeleteBehavior.Restrict);
            e.Property(s => s.Amount).HasColumnType("decimal(18,2)");
            e.Property(s => s.Reason).HasMaxLength(500);
            e.Property(s => s.TargetItemType).HasConversion<int>();
            e.Property(s => s.SourceItemType).HasConversion<int?>().IsRequired(false);
            e.Property(s => s.SourceReferenceId).IsRequired(false);
            e.Property(s => s.SourceTermMonthId).IsRequired(false);
            e.Property(s => s.IsStandaloneTransfer).HasDefaultValue(false);
        });

        builder.Entity<StudentFeeOverride>(e =>
        {
            e.HasKey(o => o.Id);
            e.HasOne(o => o.Student).WithMany()
                .HasForeignKey(o => o.StudentId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(o => o.AcademicYear).WithMany()
                .HasForeignKey(o => o.AcademicYearId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(o => o.TermMonth).WithMany()
                .HasForeignKey(o => o.TermMonthId).OnDelete(DeleteBehavior.Restrict)
                .IsRequired(false);
            e.Property(o => o.OverrideTuitionAmount).HasColumnType("decimal(18,2)");
            e.Property(o => o.Reason).HasMaxLength(500).IsRequired();
            e.Property(o => o.CreatedById).HasMaxLength(450).IsRequired();
        });
    }
}
