using System.Security.Claims;
using SchoolPaymentSystem.Models.user;

namespace SchoolPaymentSystem.Helpers;

public interface IJwtHelper
{
    string    GenerateToken(ApplicationUser user, IList<string> roles);
    ClaimsPrincipal? ValidateToken(string token);
}