using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolPaymentSystem.DTO.Auth;
using SchoolPaymentSystem.Services.Interfaces;

namespace SchoolPaymentSystem.Controllers;

[Route("api/auth")]
public class AuthController : BaseController
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth) => _auth = auth;

    // ── POST /api/auth/login ──────────────────────────────────────────────────
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(LoginResponse), 200)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _auth.LoginAsync(request);
        return Ok(result, "Login successful.");
    }

    // ── POST /api/auth/register ───────────────────────────────────────────────
    /// <summary>Create a new staff account. Admin only.</summary>
    [HttpPost("register")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(UserDto), 201)]
    [ProducesResponseType(400)]
    [ProducesResponseType(409)]
    public async Task<IActionResult> Register([FromBody] RegisterUserRequest request)
    {
        var user = await _auth.RegisterAsync(request);
        return Created(user, "User registered successfully.");
    }

    // ── GET /api/auth/me ──────────────────────────────────────────────────────
    /// <summary>Returns the profile of the currently authenticated user.</summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(UserDto), 200)]
    public async Task<IActionResult> Me()
    {
        var user = await _auth.GetUserByIdAsync(CurrentUserId);
        return Ok(user);
    }

    // ── PUT /api/auth/change-password ─────────────────────────────────────────
    /// <summary>Change the current user's password.</summary>
    [HttpPut("change-password")]
    [Authorize]
    [ProducesResponseType(200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        await _auth.ChangePasswordAsync(CurrentUserId, request);
        return NoContent("Password changed successfully.");
    }

    // ── GET /api/auth/users ───────────────────────────────────────────────────
    /// <summary>List all staff users. Admin only.</summary>
    [HttpGet("users")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(List<UserDto>), 200)]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _auth.GetAllUsersAsync();
        return Ok(users);
    }

    // ── GET /api/auth/users/{id} ──────────────────────────────────────────────
    /// <summary>Get a single staff user by ID. Admin only.</summary>
    [HttpGet("users/{id}")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(UserDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetUser(string id)
    {
        var user = await _auth.GetUserByIdAsync(id);
        return Ok(user);
    }

    // ── PUT /api/auth/signature ───────────────────────────────────────────────
    /// <summary>
    /// Save or clear the current user's signature image.
    /// The client sends the full Base64 data URI from a canvas draw or file upload.
    /// Pass { signatureImageBase64: null } to clear.
    /// </summary>
    [HttpPut("signature")]
    [Authorize]
    [ProducesResponseType(typeof(UserDto), 200)]
    public async Task<IActionResult> SaveSignature([FromBody] SaveSignatureRequest request)
    {
        var user = await _auth.SaveSignatureAsync(CurrentUserId, request);
        return Ok(user, "Signature saved.");
    }

    // ── PUT /api/auth/users/{id}/deactivate ───────────────────────────────────
    /// <summary>Deactivate a staff account. Admin only.</summary>
    [HttpPut("users/{id}/deactivate")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Deactivate(string id)
    {
        await _auth.DeactivateUserAsync(id);
        return NoContent("User deactivated.");
    }

    // ── PUT /api/auth/users/{id}/reactivate ───────────────────────────────────
    /// <summary>Re-activate a deactivated staff account. Admin only.</summary>
    [HttpPut("users/{id}/reactivate")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Reactivate(string id)
    {
        await _auth.ReactivateUserAsync(id);
        return NoContent("User reactivated.");
    }
}