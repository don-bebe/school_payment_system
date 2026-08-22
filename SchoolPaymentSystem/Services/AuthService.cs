using Microsoft.AspNetCore.Identity;
using SchoolPaymentSystem.DTO.Auth;
using SchoolPaymentSystem.Exceptions;
using SchoolPaymentSystem.Helpers;
using SchoolPaymentSystem.Models.user;
using SchoolPaymentSystem.Services.Interfaces;

namespace SchoolPaymentSystem.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser>  _users;
    private readonly SignInManager<ApplicationUser> _signIn;
    private readonly IJwtHelper _jwt;
    private readonly IAuditService _audit;

    public AuthService(
        UserManager<ApplicationUser> users,
        SignInManager<ApplicationUser> signIn,
        IJwtHelper jwt,
        IAuditService audit)
    {
        _users  = users;
        _signIn = signIn;
        _jwt    = jwt;
        _audit  = audit;
    }

    // ── Login ─────────────────────────────────────────────────────────────────
    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var user = await _users.FindByEmailAsync(request.Email)
                   ?? throw new NotFoundException("No account found with that email address.");

        if (!user.IsActive)
            throw new ForbiddenException("This account has been deactivated. Contact an administrator.");

        var result = await _signIn.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);

        if (result.IsLockedOut)
            throw new ForbiddenException("Account is locked due to too many failed attempts. Try again later.");

        if (!result.Succeeded)
        {
            await _audit.LogAsync("LOGIN_FAILED", "ApplicationUser", user.Id, success: false,
                errorMessage: "Invalid password");
            throw new AppException("Invalid email or password.");
        }

        user.LastLogin = DateTime.Now;
        await _users.UpdateAsync(user);

        var roles = await _users.GetRolesAsync(user);
        var token = _jwt.GenerateToken(user, roles);

        await _audit.LogAsync("LOGIN_SUCCESS", "ApplicationUser", user.Id);

        return new LoginResponse(
            Token:   token,
            Expires: DateTime.Now.AddHours(8),
            User:    ToDto(user, roles.FirstOrDefault() ?? string.Empty));
    }

    // ── Register ──────────────────────────────────────────────────────────────
    public async Task<UserDto> RegisterAsync(RegisterUserRequest request)
    {
        var validRoles = new[] { "Admin", "Receptionist", "Clerk" };
        if (!validRoles.Contains(request.Role))
            throw new ValidationException("role", $"Role must be one of: {string.Join(", ", validRoles)}");

        if (await _users.FindByEmailAsync(request.Email) is not null)
            throw new ConflictException($"An account with email '{request.Email}' already exists.");

        var user = new ApplicationUser
        {
            FirstName = request.FirstName,
            LastName  = request.LastName,
            Email     = request.Email,
            UserName  = request.Email,
            Role      = request.Role,
            IsActive  = true
        };

        var result = await _users.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            var errors = result.Errors.ToDictionary(e => e.Code, e => new[] { e.Description });
            throw new Exceptions.ValidationException(errors);
        }

        await _users.AddToRoleAsync(user, request.Role);
        await _audit.LogAsync("CREATE_USER", "ApplicationUser", user.Id, newValues: new { user.Email, user.Role });

        return ToDto(user, request.Role);
    }

    // ── Change Password ───────────────────────────────────────────────────────
    public async Task ChangePasswordAsync(string userId, ChangePasswordRequest request)
    {
        var user = await _users.FindByIdAsync(userId)
                   ?? throw new NotFoundException("ApplicationUser", userId);

        var result = await _users.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
        {
            var errors = result.Errors.ToDictionary(e => e.Code, e => new[] { e.Description });
            throw new Exceptions.ValidationException(errors);
        }

        await _audit.LogAsync("CHANGE_PASSWORD", "ApplicationUser", userId);
    }

    // ── Activate / Deactivate ─────────────────────────────────────────────────
    public async Task DeactivateUserAsync(string userId)
    {
        var user = await _users.FindByIdAsync(userId)
                   ?? throw new NotFoundException("ApplicationUser", userId);
        user.IsActive = false;
        await _users.UpdateAsync(user);
        await _audit.LogAsync("DEACTIVATE_USER", "ApplicationUser", userId);
    }

    public async Task ReactivateUserAsync(string userId)
    {
        var user = await _users.FindByIdAsync(userId)
                   ?? throw new NotFoundException("ApplicationUser", userId);
        user.IsActive = true;
        await _users.UpdateAsync(user);
        await _audit.LogAsync("REACTIVATE_USER", "ApplicationUser", userId);
    }

    // ── Queries ───────────────────────────────────────────────────────────────
    public async Task<List<UserDto>> GetAllUsersAsync()
    {
        var users = _users.Users.ToList();
        var dtos  = new List<UserDto>();
        foreach (var u in users)
        {
            var roles = await _users.GetRolesAsync(u);
            dtos.Add(ToDto(u, roles.FirstOrDefault() ?? u.Role));
        }
        return dtos;
    }

    public async Task<UserDto> GetUserByIdAsync(string userId)
    {
        var user  = await _users.FindByIdAsync(userId)
                    ?? throw new NotFoundException("ApplicationUser", userId);
        var roles = await _users.GetRolesAsync(user);
        return ToDto(user, roles.FirstOrDefault() ?? user.Role);
    }

    // ── Signature ─────────────────────────────────────────────────────────────
    public async Task<UserDto> SaveSignatureAsync(string userId, SaveSignatureRequest request)
    {
        var user = await _users.FindByIdAsync(userId)
                   ?? throw new NotFoundException("User", userId);

        user.SignatureImageBase64 = request.SignatureImageBase64;
        await _users.UpdateAsync(user);

        return await GetUserByIdAsync(userId);
    }

    // ── Mapping ───────────────────────────────────────────────────────────────
    private static UserDto ToDto(ApplicationUser user, string role) => new(
        user.Id, user.FirstName, user.LastName,
        user.Email!, role, user.IsActive, user.LastLogin,
        user.SignatureImageBase64);
}