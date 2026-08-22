namespace SchoolPaymentSystem.Exceptions;

public class ValidationException : AppException
{
    public IDictionary<string, string[]> Errors { get; }

    public ValidationException(IDictionary<string, string[]> errors)
        : base("One or more validation errors occurred.")
    {
        Errors = errors;
    }

    public ValidationException(string field, string error)
        : base(error)
    {
        Errors = new Dictionary<string, string[]> { [field] = [error] };
    }
}