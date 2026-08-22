namespace SchoolPaymentSystem.Exceptions;

public class PaymentException : BusinessRuleException
{
    public PaymentException(string message) : base(message) { }
}