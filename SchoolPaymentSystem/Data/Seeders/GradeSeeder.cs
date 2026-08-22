using Microsoft.EntityFrameworkCore;
using SchoolPaymentSystem.Models.grade;

namespace SchoolPaymentSystem.Data.Seeders;

public static class GradeSeeder
{
    public static async Task SeedAsync(ApplicationDbContext db)
    {
        if (await db.Grade.AnyAsync())
        {
            Console.WriteLine("  [GradeSeeder] Grades already seeded — skipping.");
            return;
        }

        var grades = new List<Grade>
        {
            new() { Name = "ECD A",   Level = 0, Description = "Early Childhood Development A (age 3–4)", IsActive = true },
            new() { Name = "ECD B",   Level = 1, Description = "Early Childhood Development B (age 4–5)", IsActive = true },
            new() { Name = "Grade 1", Level = 2, Description = "Grade 1 (age 6–7)",                       IsActive = true },
            new() { Name = "Grade 2", Level = 3, Description = "Grade 2 (age 7–8)",                       IsActive = true },
            new() { Name = "Grade 3", Level = 4, Description = "Grade 3 (age 8–9)",                       IsActive = true },
            new() { Name = "Grade 4", Level = 5, Description = "Grade 4 (age 9–10)",                      IsActive = true },
            new() { Name = "Grade 5", Level = 6, Description = "Grade 5 (age 10–11)",                     IsActive = true },
            new() { Name = "Grade 6", Level = 7, Description = "Grade 6 (age 11–12)",                     IsActive = true },
            new() { Name = "Grade 7", Level = 8, Description = "Grade 7 (age 12–13)",                     IsActive = true },
        };

        await db.Grade.AddRangeAsync(grades);
        await db.SaveChangesAsync();

        Console.WriteLine($"  [GradeSeeder] Seeded {grades.Count} grades (ECD A → Grade 7).");
    }
}