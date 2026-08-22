using System.Security.Claims;
using Microsoft.IdentityModel.JsonWebTokens;

namespace SchoolPaymentSystem.Helpers;

public class CurrentUser : ICurrentUser
{
    private readonly IHttpContextAccessor _http;

    public CurrentUser(IHttpContextAccessor http) => _http = http;

    private ClaimsPrincipal? Principal => _http.HttpContext?.User;

    public string UserId
    {
        get
        {
            // First try to get the user ID from the sub claim (JWT standard)
            var userId = Principal?.FindFirstValue("sub");
            
            // If not found, try NameIdentifier
            if (string.IsNullOrEmpty(userId))
                userId = Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
            
            // If still not found, try looking for any claim that might contain the ID
            if (string.IsNullOrEmpty(userId))
            {
                // Some JWT libraries put the user ID in a custom claim
                userId = Principal?.FindFirstValue("userId") 
                         ?? Principal?.FindFirstValue("id")
                         ?? Principal?.FindFirstValue(JwtRegisteredClaimNames.NameId)
                         ?? string.Empty;
            }
            
            return userId ?? string.Empty;
        }
    }

    public string Email =>
        Principal?.FindFirstValue(ClaimTypes.Email)
        ?? Principal?.FindFirstValue("email")
        ?? string.Empty;

    public string FullName
    {
        get
        {
            var first = Principal?.FindFirstValue("firstName") ?? string.Empty;
            var last  = Principal?.FindFirstValue("lastName")  ?? string.Empty;
            return $"{first} {last}".Trim();
        }
    }

    public bool IsAuthenticated =>
        Principal?.Identity?.IsAuthenticated == true;

    public bool IsInRole(string role) =>
        Principal?.IsInRole(role) == true;

    public string? IpAddress =>
        _http.HttpContext?.Connection?.RemoteIpAddress?.ToString();
}