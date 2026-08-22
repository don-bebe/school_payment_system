namespace SchoolPaymentSystem.Exceptions;

public class NotFoundException : AppException
{
    public NotFoundException(string entity, object id)
        : base($"{entity} with id '{id}' was not found.") { }

    public NotFoundException(string message) : base(message) { }
}