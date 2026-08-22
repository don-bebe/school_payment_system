using Microsoft.EntityFrameworkCore;
using SchoolPaymentSystem.Models.expenses; // Note the plural 'expenses' namespace

namespace SchoolPaymentSystem.Data.Seeders;

public static class ExpenseCategorySeeder
{
    public static async Task SeedAsync(ApplicationDbContext db)
    {
        // Check if any expense categories exist using the correct DbSet name
        if (await db.ExpenseCategory.AnyAsync())
        {
            Console.WriteLine("  [ExpenseCategorySeeder] Expense categories already seeded — skipping.");
            return;
        }

        var expenseCategories = new List<ExpenseCategory>
        {
            new() { 
                Id = 1,
                Name = "Salary", 
                IsActive = true
                // Note: Don't include fields that don't exist in your model
            },
            new() { 
                Id = 2,
                Name = "Water", 
                IsActive = true
            },
            new() { 
                Id = 3,
                Name = "Rent", 
                IsActive = true
            },
            new() { 
                Id = 4,
                Name = "Utilities", 
                IsActive = true
            },
            new() { 
                Id = 5,
                Name = "Stationery", 
                IsActive = true
            },
            new() { 
                Id = 6,
                Name = "Miscellaneous", 
                IsActive = true
            },
            // Optional additional categories
            new() { 
                Id = 7,
                Name = "Maintenance", 
                IsActive = true
            },
            new() { 
                Id = 8,
                Name = "Transport", 
                IsActive = true
            },
            new() { 
                Id = 9,
                Name = "Food Supplies", 
                IsActive = true
            },
            new() { 
                Id = 10,
                Name = "Equipment", 
                IsActive = true
            }
        };

        await db.ExpenseCategory.AddRangeAsync(expenseCategories);
        await db.SaveChangesAsync();

        Console.WriteLine($"  [ExpenseCategorySeeder] Seeded {expenseCategories.Count} expense categories.");
    }
}