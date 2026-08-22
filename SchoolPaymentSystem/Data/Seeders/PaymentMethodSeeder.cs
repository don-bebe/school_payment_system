using Microsoft.EntityFrameworkCore;
using SchoolPaymentSystem.Models.payment;

namespace SchoolPaymentSystem.Data.Seeders;

public static class PaymentMethodSeeder
{
    public static async Task SeedAsync(ApplicationDbContext db)
    {
        // Check if any payment methods exist using the correct DbSet name
        if (await db.PaymentMethod.AnyAsync())
        {
            Console.WriteLine("  [PaymentMethodSeeder] Payment methods already seeded — skipping.");
            return;
        }

        var paymentMethods = new List<PaymentMethod>
        {
            new() { 
                Id = 1,
                Name = "Cash", 
                Code = "CASH", 
                RequiresReference = false, 
                IsActive = true
                // Note: Don't include CreatedAt if it doesn't exist in your model
            },
            new() { 
                Id = 2,
                Name = "EcoCash", 
                Code = "ECOCASH", 
                RequiresReference = true, 
                IsActive = true
            },
            new() { 
                Id = 3,
                Name = "Prepayment", 
                Code = "PREPAYMENT", 
                RequiresReference = false, 
                IsActive = true
            },
        };

        await db.PaymentMethod.AddRangeAsync(paymentMethods);
        await db.SaveChangesAsync();

        Console.WriteLine($"  [PaymentMethodSeeder] Seeded {paymentMethods.Count} payment methods.");
    }
}