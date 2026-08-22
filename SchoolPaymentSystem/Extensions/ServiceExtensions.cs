using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SchoolPaymentSystem.Data;
using SchoolPaymentSystem.Helpers;
using SchoolPaymentSystem.Models.user;
using SchoolPaymentSystem.Services;
using SchoolPaymentSystem.Services.Interfaces;

namespace SchoolPaymentSystem.Extensions;

public static class ServiceExtensions
{
    // ── Database ──────────────────────────────────────────────────────────────
    public static IServiceCollection AddDatabase(
        this IServiceCollection services, IConfiguration config)
    {
        var conn = config.GetConnectionString("DefaultConnection");
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseMySql(conn, ServerVersion.AutoDetect(conn)));

        return services;
    }

    // ── ASP.NET Identity ──────────────────────────────────────────────────────
    public static IServiceCollection AddIdentityConfig(this IServiceCollection services)
    {
        services.AddIdentity<ApplicationUser, IdentityRole>(options =>
        {
            // Password rules
            options.Password.RequiredLength         = 8;
            options.Password.RequireDigit           = true;
            options.Password.RequireUppercase       = true;
            options.Password.RequireNonAlphanumeric = false;

            // Lockout
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.DefaultLockoutTimeSpan  = TimeSpan.FromMinutes(15);
            options.Lockout.AllowedForNewUsers      = true;

            // User
            options.User.RequireUniqueEmail = true;
        })
        .AddEntityFrameworkStores<ApplicationDbContext>()
        .AddDefaultTokenProviders();

        return services;
    }

    // ── JWT Authentication ────────────────────────────────────────────────────
    public static IServiceCollection AddJwtAuth(
        this IServiceCollection services, IConfiguration config)
    {
        var jwt = config.GetSection("Jwt");
        var key = Encoding.UTF8.GetBytes(jwt["Key"]!);

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey         = new SymmetricSecurityKey(key),
                ValidateIssuer           = true,
                ValidIssuer              = jwt["Issuer"],
                ValidateAudience         = true,
                ValidAudience            = jwt["Audience"],
                ValidateLifetime         = true,
                ClockSkew                = TimeSpan.Zero
            };
        });

        services.AddAuthorization(options =>
        {
            options.AddPolicy("AdminOnly",         p => p.RequireRole("Admin"));
            options.AddPolicy("AdminOrReception",  p => p.RequireRole("Admin", "Receptionist"));
            options.AddPolicy("AnyStaff",          p => p.RequireRole("Admin", "Receptionist"));
        });

        return services;
    }

    // ── Application Services ──────────────────────────────────────────────────
    public static IServiceCollection AddAppServices(this IServiceCollection services)
    {
        // Helpers
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUser,   CurrentUser>();
        services.AddScoped<IJwtHelper,     JwtHelper>();

        // Domain services
        services.AddScoped<IAuditService,    AuditService>();
        services.AddScoped<IAuthService,     AuthService>();
        services.AddScoped<IAcademicService, AcademicService>();
        services.AddScoped<IFeeSettingService,  FeeSettingService>();
        services.AddScoped<IFeeRuleService,     FeeRuleService>();
        services.AddScoped<IEligibleItemsService, EligibleItemsService>();
        services.AddScoped<IPaymentOrchestrator,  PaymentOrchestrator>();
        services.AddScoped<IStudentService,  StudentService>();
        services.AddScoped<IPaymentService,  PaymentService>();
        services.AddScoped<ITransferService, TransferService>();
        services.AddScoped<IZigRateService,  ZigRateService>();
        services.AddScoped<IExpenseService,  ExpenseService>();
        services.AddScoped<IReportService,          ReportService>();
        services.AddScoped<INotificationService,    NotificationService>();
        services.AddScoped<IDashboardService,        DashboardService>();

        return services;
    }
}