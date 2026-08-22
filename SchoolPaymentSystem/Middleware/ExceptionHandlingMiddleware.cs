using System.Net;
using System.Text.Json;
using SchoolPaymentSystem.Exceptions;
using SchoolPaymentSystem.Helpers;

namespace SchoolPaymentSystem.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next   = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleAsync(context, ex);
        }
    }

    private async Task HandleAsync(HttpContext context, Exception exception)
    {
        var (statusCode, response) = exception switch
        {
            ValidationException ve => (
                HttpStatusCode.BadRequest,
                ApiResponse.Fail("Validation failed.", ve.Errors)),

            NotFoundException nfe => (
                HttpStatusCode.NotFound,
                ApiResponse.Fail(nfe.Message)),

            ForbiddenException fe => (
                HttpStatusCode.Forbidden,
                ApiResponse.Fail(fe.Message)),

            ConflictException ce => (
                HttpStatusCode.Conflict,
                ApiResponse.Fail(ce.Message)),

            // This pattern requires the using directive
            BusinessRuleException or PaymentException => (
                HttpStatusCode.UnprocessableEntity,
                ApiResponse.Fail(exception.Message)),

            AppException ae => (
                HttpStatusCode.BadRequest,
                ApiResponse.Fail(ae.Message)),

            UnauthorizedAccessException => (
                HttpStatusCode.Unauthorized,
                ApiResponse.Fail("Unauthorised.")),

            _ => (
                HttpStatusCode.InternalServerError,
                ApiResponse.Fail("An unexpected error occurred. Please try again."))
        };

        // Log server errors with full stack trace; client errors at warning level
        if (statusCode == HttpStatusCode.InternalServerError)
            _logger.LogError(exception, "Unhandled exception for {Path}", context.Request.Path);
        else
            _logger.LogWarning(exception, "Handled exception for {Path}: {Message}",
                context.Request.Path, exception.Message);

        context.Response.StatusCode  = (int)statusCode;
        context.Response.ContentType = "application/json";

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}