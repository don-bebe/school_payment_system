using SchoolPaymentSystem.DTO.Expense;

namespace SchoolPaymentSystem.Services.Interfaces;

public interface IExpenseService
{
    Task<ExpenseDto>               CreateAsync(CreateExpenseRequest request);
    Task<ExpenseDto>               UpdateAsync(int id, UpdateExpenseRequest request);
    Task                           DeleteAsync(int id);
    Task<ExpenseDto>               GetByIdAsync(int id);
    Task<List<ExpenseDto>>         GetByDateRangeAsync(DateTime from, DateTime to, int? academicYearId);

    Task<ExpenseCategoryDto>       CreateCategoryAsync(CreateExpenseCategoryRequest request);
    Task<List<ExpenseCategoryDto>> GetCategoriesAsync();
}