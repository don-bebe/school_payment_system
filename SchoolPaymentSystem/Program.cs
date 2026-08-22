using Microsoft.EntityFrameworkCore;
using SchoolPaymentSystem.Data;
using SchoolPaymentSystem.Data.Seeders;
using SchoolPaymentSystem.Extensions;

var builder = WebApplication.CreateBuilder(args);

// ── Windows Service support (only activated when actually running as a service)
// Safe to keep on Linux — it does nothing when not running as a Windows service
if (OperatingSystem.IsWindows())
    builder.Host.UseWindowsService();

// ── Bind to all network interfaces so LAN clients can reach this server ───────
builder.WebHost.UseUrls("http://0.0.0.0:5221");

// ── Services ──────────────────────────────────────────────────────────────────
builder.Services
    .AddDatabase(builder.Configuration)
    .AddIdentityConfig()
    .AddJwtAuth(builder.Configuration)
    .AddAppServices()
    .AddControllers(options => { })
    .AddJsonOptions(opts =>
    {
        // Serialize enums as strings so the frontend can match by name (e.g. "Tuition")
        // instead of integer index. Without this, PaymentItemType.Tuition serialises as 0,
        // which breaks the AUTO_TYPES / STANDALONE_TYPES checks in NewPaymentPage.jsx.
        opts.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter());
        opts.JsonSerializerOptions.PropertyNamingPolicy =
            System.Text.Json.JsonNamingPolicy.CamelCase;
    })
    .Services
    .AddEndpointsApiExplorer()
    .AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new() { Title = "School Payment System API", Version = "v1" });
        c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
        {
            Name         = "Authorization",
            Type         = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
            Scheme       = "bearer",
            BearerFormat = "JWT",
            In           = Microsoft.OpenApi.Models.ParameterLocation.Header,
            Description  = "Enter your JWT token (without the 'Bearer' prefix)."
        });
        c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
        {
            {
                new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                {
                    Reference = new() { Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "Bearer" }
                },
                Array.Empty<string>()
            }
        });
    });

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
        policy
            .SetIsOriginAllowed(_ => true)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});

// ── Build app ─────────────────────────────────────────────────────────────────
var app = builder.Build();

var startupLogger = app.Services.GetRequiredService<ILogger<Program>>();

// ── Always show Swagger (useful on LAN for testing) ───────────────────────────
app.UseSwagger();
app.UseSwaggerUI();

// ── Wait for MySQL, then migrate + seed ───────────────────────────────────────
const int maxRetries   = 10;
const int retryDelayMs = 6000;

for (int attempt = 1; attempt <= maxRetries; attempt++)
{
    try
    {
        startupLogger.LogInformation(
            "Database startup attempt {Attempt}/{Max}...", attempt, maxRetries);

        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await db.Database.MigrateAsync();
            startupLogger.LogInformation("Migrations applied successfully.");
        }

        await DatabaseSeeder.SeedAllAsync(app.Services);
        startupLogger.LogInformation("Database seeded successfully.");

        break;
    }
    catch (Exception ex) when (attempt < maxRetries)
    {
        startupLogger.LogWarning(
            ex,
            "Database not ready (attempt {Attempt}/{Max}). Retrying in {Delay}s...",
            attempt, maxRetries, retryDelayMs / 1000);

        await Task.Delay(retryDelayMs);
    }
    catch (Exception ex)
    {
        startupLogger.LogCritical(
            ex,
            "Database failed after {Max} attempts. " +
            "Check MySQL is running and appsettings.json connection string is correct.",
            maxRetries);
        throw;
    }
}

// ── HTTP pipeline ─────────────────────────────────────────────────────────────
app.UseCors("AllowAll");
app.UseAppMiddleware(app.Environment);
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();