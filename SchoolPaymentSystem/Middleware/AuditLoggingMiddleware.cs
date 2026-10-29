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

        context.Request.EnableBuffering();

        string? requestBody = null;
        using (var reader = new StreamReader(context.Request.Body, leaveOpen: true))
        {
            requestBody = await reader.ReadToEndAsync();
            context.Request.Body.Position = 0;
        }

        // Buffer the response so we can read the status code after the pipeline runs
        var originalBody = context.Response.Body;
        using var buffer = new MemoryStream();
        context.Response.Body = buffer;

        bool    success      = true;
        string? errorMessage = null;
        string? responseBody = null;

        try
        {
            await _next(context);

            success = context.Response.StatusCode is >= 200 and < 400;
            if (!success)
                errorMessage = $"HTTP {context.Response.StatusCode}";

            buffer.Seek(0, SeekOrigin.Begin);
            using var responseReader = new StreamReader(buffer, leaveOpen: true);
            responseBody = await responseReader.ReadToEndAsync();
            buffer.Seek(0, SeekOrigin.Begin);
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
            var requestMeta = new
            {
                context.Request.Method,
                Path = context.Request.Path.Value,
                Query = context.Request.QueryString.Value,
                ContentType = context.Request.ContentType,
                RequestBody = NormalizeAuditPayload(requestBody),
            };
            var responseMeta = new
            {
                StatusCode = context.Response.StatusCode,
                ContentType = context.Response.ContentType,
                ResponseBody = NormalizeAuditPayload(responseBody),
            };

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
                    UserId       = userId,
                    UserName     = userName,
                    Action       = action,
                    EntityName   = "HttpRequest",
                    EntityId     = context.Request.Path,
                    OldValues    = ToJsonString(requestMeta),
                    NewValues    = ToJsonString(responseMeta),
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
                _logger.LogError(auditEx, "Failed to write audit log for {Action}", action);
            }
        }
    }

    private static string? NormalizeAuditPayload(string? payload)
    {
        if (string.IsNullOrWhiteSpace(payload)) return null;

        var trimmed = payload.Trim();
        if (trimmed.Length > 8000)
            trimmed = trimmed.Substring(0, 8000) + "... [truncated]";

        return trimmed;
    }

    private static string? ToJsonString(object? value)
    {
        if (value is null) return null;

        try
        {
            return System.Text.Json.JsonSerializer.Serialize(value, new System.Text.Json.JsonSerializerOptions
            {
                WriteIndented = true,
                DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
            });
        }
        catch
        {
            return value.ToString();
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