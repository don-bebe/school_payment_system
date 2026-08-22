using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SchoolPaymentSystem.Models.user;

namespace SchoolPaymentSystem.Data.Seeders;

public static class DatabaseSeeder
{
    public static async Task SeedAllAsync(IServiceProvider services)
    {
        // Resolve scoped services from the DI container
        using var scope = services.CreateScope();
        var sp     = scope.ServiceProvider;
        var logger = sp.GetRequiredService<ILogger<ApplicationDbContext>>();

        try
        {
            var db          = sp.GetRequiredService<ApplicationDbContext>();
            var roleManager = sp.GetRequiredService<RoleManager<IdentityRole>>();
            var userManager = sp.GetRequiredService<UserManager<ApplicationUser>>();

            logger.LogInformation("=== Database Seeding Started ===");

            // 1 ── Apply any pending EF Core migrations automatically
            var pending = (await db.Database.GetPendingMigrationsAsync()).ToList();
            if (pending.Count > 0)
            {
                logger.LogInformation("[Migrations] Applying {Count} pending migration(s): {Names}",
                    pending.Count, string.Join(", ", pending));
                await db.Database.MigrateAsync();
            }
            else
            {
                logger.LogInformation("[Migrations] Schema is up to date — no migrations needed.");
            }

            // 2 ── Identity Roles
            logger.LogInformation("[Step 2/6] Seeding roles...");
            await RoleSeeder.SeedAsync(roleManager);

            // 3 ── Default Users
            logger.LogInformation("[Step 3/6] Seeding default users...");
            await UserSeeder.SeedAsync(userManager, logger);

            // 4 ── Grades
            logger.LogInformation("[Step 4/6] Seeding grades...");
            await GradeSeeder.SeedAsync(db);

            // 5 ── Payment Methods
            logger.LogInformation("[Step 5/6] Seeding payment methods...");
            await PaymentMethodSeeder.SeedAsync(db);

            // 6 ── Expense Categories
            logger.LogInformation("[Step 6/6] Seeding expense categories...");
            await ExpenseCategorySeeder.SeedAsync(db);

            logger.LogInformation("=== Database Seeding Completed ===");
        }
        catch (Exception ex)
        {
            logger.LogCritical(ex, "=== Database Seeding FAILED ===");
            throw; // Rethrow so the app doesn't start with a broken database
        }
    }
}