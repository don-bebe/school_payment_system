using Microsoft.AspNetCore.Mvc;
using SchoolPaymentSystem.Helpers;

namespace SchoolPaymentSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public abstract class BaseController : ControllerBase
{
    protected IActionResult Ok<T>(T data, string message = "Success") =>
        base.Ok(ApiResponse<T>.Ok(data, message));

    protected IActionResult Created<T>(T data, string message = "Created successfully") =>
        StatusCode(201, ApiResponse<T>.Ok(data, message));

    protected IActionResult NoContent(string message = "Operation completed successfully") =>
        base.Ok(ApiResponse.Ok(message));

    protected string CurrentUserId =>
        User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value
        ?? string.Empty;
}