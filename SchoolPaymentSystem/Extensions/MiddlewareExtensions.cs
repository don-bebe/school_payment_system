using SchoolPaymentSystem.Middleware;

namespace SchoolPaymentSystem.Extensions;

public static class MiddlewareExtensions
{
    public static IApplicationBuilder UseAppMiddleware(
        this IApplicationBuilder app, IWebHostEnvironment env)
    {
        // 1 — Global exception handler must be first
        app.UseMiddleware<ExceptionHandlingMiddleware>();

        // 2 — Request/response timing (skip in production)
        if (!env.IsProduction())
            app.UseMiddleware<RequestLoggingMiddleware>();

        // 3 — HTTP-level audit trail (registered after UseAuthentication)
        //     Actual service-layer audit is handled inside each service.
        app.UseMiddleware<AuditLoggingMiddleware>();

        return app;
    }
}