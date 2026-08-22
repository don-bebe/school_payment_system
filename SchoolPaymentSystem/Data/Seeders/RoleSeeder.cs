using Microsoft.AspNetCore.Identity;

namespace SchoolPaymentSystem.Data.Seeders;

public static class RoleSeeder
{
    public static readonly string[] Roles = ["Admin", "Receptionist"];

    public static async Task SeedAsync(RoleManager<IdentityRole> roleManager)
    {
        foreach (var role in Roles)
        {
            if (await roleManager.RoleExistsAsync(role))
            {
                Console.WriteLine($"  [RoleSeeder] Role '{role}' already exists — skipping.");
                continue;
            }

            var result = await roleManager.CreateAsync(new IdentityRole(role));

            if (result.Succeeded)
                Console.WriteLine($"  [RoleSeeder] Created role '{role}'.");
            else
                Console.WriteLine($"  [RoleSeeder] ERROR creating role '{role}': " +
                                  string.Join(", ", result.Errors.Select(e => e.Description)));
        }
    }
}