using SchoolPaymentSystem.DTO.Auth;

namespace SchoolPaymentSystem.Services.Interfaces;

public interface IAuthService
{
    Task<LoginResponse>  LoginAsync(LoginRequest request);
    Task<UserDto>        RegisterAsync(RegisterUserRequest request);
    Task                 ChangePasswordAsync(string userId, ChangePasswordRequest request);
    Task                 DeactivateUserAsync(string userId);
    Task                 ReactivateUserAsync(string userId);
    Task<List<UserDto>>  GetAllUsersAsync();
    Task<UserDto>        GetUserByIdAsync(string userId);
    Task<UserDto>        SaveSignatureAsync(string userId, SaveSignatureRequest request);
}