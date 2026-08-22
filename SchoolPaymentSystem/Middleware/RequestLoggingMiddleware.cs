namespace SchoolPaymentSystem.Middleware;

public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next   = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var start = DateTime.Now;

        await _next(context);

        var elapsed = (DateTime.Now - start).TotalMilliseconds;

        _logger.LogInformation(
            "{Method} {Path}{Query} → {StatusCode} ({Elapsed:0}ms)",
            context.Request.Method,
            context.Request.Path,
            context.Request.QueryString,
            context.Response.StatusCode,
            elapsed);
    }
}