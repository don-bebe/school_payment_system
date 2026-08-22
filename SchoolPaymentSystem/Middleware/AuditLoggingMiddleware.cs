using SchoolPaymentSystem.Data;
using SchoolPaymentSystem.Helpers;
using SchoolPaymentSystem.Models;

namespace SchoolPaymentSystem.Middleware;

public class AuditLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AuditLoggingMiddleware> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    // Methods that mutate state
    private static readonly HashSet<string> MutatingMethods =
        new(StringComparer.OrdinalIgnoreCase) { "POST", "PUT", "PATCH", "DELETE" };

    public AuditLoggingMiddleware(
        RequestDelegate next,
        ILogger<AuditLoggingMiddleware> logger,
        IServiceScopeFactory scopeFactory)
    {
        _next         = next;
        _logger       = logger;
        _scopeFactory = scopeFactory;
    }

    public async Task InvokeAsync(HttpContext context, ICurrentUser currentUser)
    {
        // Always log login attempts, even if unauthenticated
        var isLoginEndpoint = context.Request.Path.StartsWithSegments("/api/auth/login");

        if (!MutatingMethods.Contains(context.Request.Method) && !isLoginEndpoint)
        {
            await _next(context);
            return;
        }

        // Buffer the response so we can read the status code after the pipeline runs
        var originalBody = context.Response.Body;
        using var buffer = new MemoryStream();
        context.Response.Body = buffer;

        bool    success      = true;
        string? errorMessage = null;

        try
        {
            await _next(context);

            success = context.Response.StatusCode is >= 200 and < 400;
            if (!success)
                errorMessage = $"HTTP {context.Response.StatusCode}";
        }
        catch (Exception ex)
        {
            success      = false;
            errorMessage = ex.Message;
            throw;
        }
        finally
        {
            // Restore original body stream
            buffer.Seek(0, SeekOrigin.Begin);
            await buffer.CopyToAsync(originalBody);
            context.Response.Body = originalBody;

            var action = DeriveAction(context.Request.Method, context.Request.Path);

            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

                // Resolve UserId — must be null (not "") to satisfy the FK constraint
                string? userId   = null;
                string  userName = "Anonymous";

                if (currentUser.IsAuthenticated && !string.IsNullOrEmpty(currentUser.UserId))
                {
                    userId   = currentUser.UserId;
                    userName = string.IsNullOrWhiteSpace(currentUser.FullName)
                                   ? currentUser.Email
                                   : currentUser.FullName;
                }
                else if (isLoginEndpoint)
                {
                    userName = "Login Attempt";
                }

                var log = new AuditLog
                {
                    UserId       = userId,        // null for anonymous / login attempts
                    UserName     = userName,
                    Action       = action,
                    EntityName   = "HttpRequest",
                    EntityId     = context.Request.Path,
                    IpAddress    = currentUser.IpAddress,
                    Success      = success,
                    ErrorMessage = errorMessage,
                    Timestamp    = DateTime.Now
                };

                db.AuditLog.Add(log);
                await db.SaveChangesAsync();
            }
            catch (Exception auditEx)
            {
                // Never let audit failure break the main request
                _logger.LogError(auditEx, "Failed to write audit log for {Action}", action);
            }
        }
    }

    private static string DeriveAction(string method, PathString path)
    {
        var verb = method.ToUpperInvariant() switch
        {
            "POST"   => "CREATE",
            "PUT"    => "UPDATE",
            "PATCH"  => "PATCH",
            "DELETE" => "DELETE",
            _        => method.ToUpperInvariant()
        };

        // Last non-empty, non-numeric segment gives the entity name
        var segments = path.Value?.Split('/', StringSplitOptions.RemoveEmptyEntries)
                       ?? Array.Empty<string>();
        var entity   = segments.LastOrDefault(s => !int.TryParse(s, out _))
                                ?.ToUpperInvariant() ?? "UNKNOWN";

        return $"{verb}_{entity}";
    }
}