using Microsoft.AspNetCore.Identity;
using SchoolPaymentSystem.Models.user;

namespace SchoolPaymentSystem.Data.Seeders;

public static class UserSeeder
{
    private record SeedUser(
        string FirstName,
        string LastName,
        string Email,
        string Password,
        string Role);

    private static readonly List<SeedUser> DefaultUsers =
    [
        new("System", "Admin", "admin@rockout.ac.zw", "Admin@1234!", "Admin"),
    ];

    public static async Task SeedAsync(
        UserManager<ApplicationUser> userManager,
        ILogger logger)
    {
        foreach (var seed in DefaultUsers)
        {
            // Skip if an account with this email already exists
            if (await userManager.FindByEmailAsync(seed.Email) is not null)
            {
                logger.LogInformation("[UserSeeder] User '{Email}' already exists — skipping.", seed.Email);
                continue;
            }

            var user = new ApplicationUser
            {
                FirstName          = seed.FirstName,
                LastName           = seed.LastName,
                Email              = seed.Email,
                UserName           = seed.Email,
                Role               = seed.Role,
                IsActive           = true,
                EmailConfirmed     = true,   // skip email confirmation for seed accounts
                CreatedAt          = DateTime.Now,
            };

            var createResult = await userManager.CreateAsync(user, seed.Password);

            if (!createResult.Succeeded)
            {
                var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
                logger.LogError("[UserSeeder] Failed to create '{Email}': {Errors}", seed.Email, errors);
                continue;
            }

            var roleResult = await userManager.AddToRoleAsync(user, seed.Role);

            if (!roleResult.Succeeded)
            {
                var errors = string.Join(", ", roleResult.Errors.Select(e => e.Description));
                logger.LogError("[UserSeeder] Failed to assign role '{Role}' to '{Email}': {Errors}",
                    seed.Role, seed.Email, errors);
                continue;
            }

            logger.LogInformation("[UserSeeder] Created {Role} account → {Email}", seed.Role, seed.Email);
        }
    }
}