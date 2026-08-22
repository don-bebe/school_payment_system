using Microsoft.EntityFrameworkCore;
using SchoolPaymentSystem.Data;
using SchoolPaymentSystem.DTO.Expense;
using SchoolPaymentSystem.Exceptions;
using SchoolPaymentSystem.Helpers;
using SchoolPaymentSystem.Models.expenses;
using SchoolPaymentSystem.Services.Interfaces;

namespace SchoolPaymentSystem.Services;

public class ExpenseService : IExpenseService
{
private readonly ApplicationDbContext _db;
    private readonly IAuditService _audit;
    private readonly ICurrentUser _currentUser;
    private readonly IZigRateService _zigRate;

    public ExpenseService(ApplicationDbContext db, IAuditService audit, ICurrentUser currentUser, IZigRateService zigRate)
    {
        _db          = db;
        _audit       = audit;
        _currentUser = currentUser;
        _zigRate     = zigRate;
    }

    public async Task<ExpenseDto> CreateAsync(CreateExpenseRequest request)
    {
        if (!await _db.ExpenseCategory.AnyAsync(c => c.Id == request.ExpenseCategoryId))
            throw new NotFoundException("ExpenseCategory", request.ExpenseCategoryId);

        var method = await _db.PaymentMethod.FindAsync(request.PaymentMethodId)
                     ?? throw new NotFoundException("PaymentMethod", request.PaymentMethodId);

        if (method.RequiresReference && string.IsNullOrWhiteSpace(request.Reference))
            throw new ValidationException("reference",
                $"{method.Name} expenses require a transaction reference number.");

        if (!CurrencyHelper.IsValid(request.Currency))
            throw new ValidationException("currency", "Currency must be 'USD' or 'ZIG'.");

        // ZiG → USD conversion
        decimal amountUsd;
        decimal? zigRateUsed = null;
        if (request.Currency.ToUpperInvariant() == "ZIG")
        {
            zigRateUsed = await _zigRate.GetCurrentRateValueAsync();
            amountUsd   = Math.Round(request.Amount / zigRateUsed.Value, 2);
        }
        else
        {
            amountUsd = request.Amount;
        }

        var expense = new Expense
        {
            AcademicYearId    = request.AcademicYearId,
            ExpenseCategoryId = request.ExpenseCategoryId,
            PaymentMethodId   = request.PaymentMethodId,
            Amount            = request.Amount,
            AmountUsd         = amountUsd,
            ZigRateUsed       = zigRateUsed,
            Currency          = request.Currency.ToUpperInvariant(),
            ExpenseDate       = request.ExpenseDate,
            Description       = request.Description,
            Reference         = request.Reference,
            RecordedById      = _currentUser.UserId
        };

        _db.Expense.Add(expense);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("CREATE_EXPENSE", "Expense", expense.Id.ToString(),
            newValues: new { expense.Amount, expense.Currency, expense.AmountUsd, method.Code });

        return await LoadDtoAsync(expense.Id);
    }

    public async Task<ExpenseDto> UpdateAsync(int id, UpdateExpenseRequest request)
    {
        var expense = await _db.Expense.FindAsync(id) ?? throw new NotFoundException("Expense", id);
        var old     = new { expense.Amount, expense.Currency };

        var method = await _db.PaymentMethod.FindAsync(request.PaymentMethodId)
                     ?? throw new NotFoundException("PaymentMethod", request.PaymentMethodId);

        if (method.RequiresReference && string.IsNullOrWhiteSpace(request.Reference))
            throw new ValidationException("reference",
                $"{method.Name} expenses require a transaction reference number.");

        if (!CurrencyHelper.IsValid(request.Currency))
            throw new ValidationException("currency", "Currency must be 'USD' or 'ZIG'.");

        // Recalculate USD equivalent
        decimal amountUsd;
        decimal? zigRateUsed = null;
        if (request.Currency.ToUpperInvariant() == "ZIG")
        {
            zigRateUsed = await _zigRate.GetCurrentRateValueAsync();
            amountUsd   = Math.Round(request.Amount / zigRateUsed.Value, 2);
        }
        else
        {
            amountUsd = request.Amount;
        }

        expense.ExpenseCategoryId = request.ExpenseCategoryId;
        expense.PaymentMethodId   = request.PaymentMethodId;
        expense.Amount            = request.Amount;
        expense.AmountUsd         = amountUsd;
        expense.ZigRateUsed       = zigRateUsed;
        expense.Currency          = request.Currency.ToUpperInvariant();
        expense.ExpenseDate       = request.ExpenseDate;
        expense.Description       = request.Description;
        expense.Reference         = request.Reference;

        await _db.SaveChangesAsync();
        await _audit.LogAsync("UPDATE_EXPENSE", "Expense", id.ToString(), old, new { expense.Amount, expense.AmountUsd });
        return await LoadDtoAsync(id);
    }

    public async Task DeleteAsync(int id)
    {
        var expense = await _db.Expense.FindAsync(id) ?? throw new NotFoundException("Expense", id);
        _db.Expense.Remove(expense);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("DELETE_EXPENSE", "Expense", id.ToString(),
            oldValues: new { expense.Amount, expense.Currency });
    }

    public async Task<ExpenseDto> GetByIdAsync(int id) => await LoadDtoAsync(id);

    public async Task<List<ExpenseDto>> GetByDateRangeAsync(DateTime from, DateTime to, int? academicYearId)
    {
        var q = _db.Expense.AsNoTracking()
            .Include(e => e.ExpenseCategory)
            .Include(e => e.PaymentMethod)
            .Include(e => e.RecordedBy)
            .Where(e => e.ExpenseDate >= from && e.ExpenseDate <= to);

        if (academicYearId.HasValue)
            q = q.Where(e => e.AcademicYearId == academicYearId.Value);

        return await q.OrderByDescending(e => e.ExpenseDate)
            .Select(e => MapDto(e)).ToListAsync();
    }

    public async Task<ExpenseCategoryDto> CreateCategoryAsync(CreateExpenseCategoryRequest request)
    {
        if (await _db.ExpenseCategory.AnyAsync(c => c.Name == request.Name))
            throw new ConflictException($"Expense category '{request.Name}' already exists.");

        var cat = new ExpenseCategory { Name = request.Name, Description = request.Description };
        _db.ExpenseCategory.Add(cat);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("CREATE_EXPENSE_CATEGORY", "ExpenseCategory", cat.Id.ToString());
        return new ExpenseCategoryDto(cat.Id, cat.Name, cat.Description, cat.IsActive);
    }

    public async Task<List<ExpenseCategoryDto>> GetCategoriesAsync() =>
        await _db.ExpenseCategory.AsNoTracking()
            .Where(c => c.IsActive)
            .OrderBy(c => c.Name)
            .Select(c => new ExpenseCategoryDto(c.Id, c.Name, c.Description, c.IsActive))
            .ToListAsync();

    private async Task<ExpenseDto> LoadDtoAsync(int id)
    {
        var e = await _db.Expense.AsNoTracking()
            .Include(x => x.ExpenseCategory)
            .Include(x => x.PaymentMethod)
            .Include(x => x.RecordedBy)
            .FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new NotFoundException("Expense", id);
        return MapDto(e);
    }

    private static ExpenseDto MapDto(Expense e) => new(
        e.Id,
        e.ExpenseCategory.Name,
        e.PaymentMethod.Name,
        e.PaymentMethod.Code,
        e.Reference,
        e.Amount,
        e.AmountUsd,
        e.ZigRateUsed,
        e.Currency,
        e.ExpenseDate,
        e.Description,
        $"{e.RecordedBy.FirstName} {e.RecordedBy.LastName}");
}