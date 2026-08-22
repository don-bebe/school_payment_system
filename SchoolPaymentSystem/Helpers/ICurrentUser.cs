namespace SchoolPaymentSystem.Helpers;

public interface ICurrentUser
{
    string  UserId   { get; }
    string  Email    { get; }
    string  FullName { get; }
    bool    IsAuthenticated { get; }
    bool    IsInRole(string role);
    string? IpAddress { get; }
}