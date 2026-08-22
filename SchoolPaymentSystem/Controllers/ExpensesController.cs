using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SchoolPaymentSystem.DTO.Expense;
using SchoolPaymentSystem.Services.Interfaces;

namespace SchoolPaymentSystem.Controllers;

[Authorize]
public class ExpensesController : BaseController
{
    private readonly IExpenseService _expenses;

    public ExpensesController(IExpenseService expenses) => _expenses = expenses;

    // ── GET /api/expenses ─────────────────────────────────────────────────────
    /// <summary>
    /// List expenses within a date range.
    /// Optionally filter by academicYearId.
    /// </summary>
    [HttpGet]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(List<ExpenseDto>), 200)]
    public async Task<IActionResult> GetByRange(
        [FromQuery] DateTime from,
        [FromQuery] DateTime to,
        [FromQuery] int? academicYearId = null)
    {
        var expenses = await _expenses.GetByDateRangeAsync(from, to, academicYearId);
        return Ok(expenses);
    }

    // ── GET /api/expenses/{id} ────────────────────────────────────────────────
    /// <summary>Get a single expense record by ID.</summary>
    [HttpGet("{id:int}")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(ExpenseDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetById(int id)
    {
        var expense = await _expenses.GetByIdAsync(id);
        return Ok(expense);
    }

    // ── POST /api/expenses ────────────────────────────────────────────────────
    /// <summary>
    /// Record a new expense.
    /// EcoCash and ZiG expenses require a Reference field.
    /// Clerk and Admin only.
    /// </summary>
    [HttpPost]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(ExpenseDto), 201)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Create([FromBody] CreateExpenseRequest request)
    {
        var expense = await _expenses.CreateAsync(request);
        return Created(expense, "Expense recorded.");
    }

    // ── PUT /api/expenses/{id} ────────────────────────────────────────────────
    /// <summary>Update an existing expense record. Clerk and Admin only.</summary>
    [HttpPut("{id:int}")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(ExpenseDto), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateExpenseRequest request)
    {
        var expense = await _expenses.UpdateAsync(id, request);
        return Ok(expense, "Expense updated.");
    }

    // ── DELETE /api/expenses/{id} ─────────────────────────────────────────────
    /// <summary>Delete an expense record. Admin only.</summary>
    [HttpDelete("{id:int}")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Delete(int id)
    {
        await _expenses.DeleteAsync(id);
        return NoContent("Expense deleted.");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // CATEGORIES
    // ══════════════════════════════════════════════════════════════════════════

    // ── GET /api/expenses/categories ─────────────────────────────────────────
    /// <summary>List all active expense categories.</summary>
    [HttpGet("categories")]
    [Authorize(Policy = "AnyStaff")]
    [ProducesResponseType(typeof(List<ExpenseCategoryDto>), 200)]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _expenses.GetCategoriesAsync();
        return Ok(categories);
    }

    // ── POST /api/expenses/categories ────────────────────────────────────────
    /// <summary>Create a new expense category. Admin only.</summary>
    [HttpPost("categories")]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(ExpenseCategoryDto), 201)]
    [ProducesResponseType(409)]
    public async Task<IActionResult> CreateCategory([FromBody] CreateExpenseCategoryRequest request)
    {
        var category = await _expenses.CreateCategoryAsync(request);
        return Created(category, "Category created.");
    }
}