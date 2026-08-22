using Microsoft.EntityFrameworkCore;
using SchoolPaymentSystem.Data;
using SchoolPaymentSystem.DTO.Fees;
using SchoolPaymentSystem.Exceptions;
using SchoolPaymentSystem.Models.fees;
using SchoolPaymentSystem.Models.term;
using SchoolPaymentSystem.Services.Interfaces;

namespace SchoolPaymentSystem.Services;

public class FeeSettingService : IFeeSettingService
{
    private readonly ApplicationDbContext _db;
    private readonly IAuditService        _audit;

    public FeeSettingService(ApplicationDbContext db, IAuditService audit)
    {
        _db    = db;
        _audit = audit;
    }

    // ── Term custom fees ─────────────────────────────────────────────────────

    public async Task<TermCustomFeeDto> CreateCustomFeeAsync(CreateCustomFeeRequest request)
    {
        var termFee = await _db.TermFee.FindAsync(request.TermFeeId)
            ?? throw new NotFoundException("TermFee", request.TermFeeId);

        var entity = new TermCustomFee
        {
            TermFeeId = request.TermFeeId,
            Name      = request.Name.Trim(),
            Amount    = request.Amount,
            IsActive  = true
        };
        entity.SetApplicableMonthIds(request.ApplicableTermMonthIds);

        _db.TermCustomFee.Add(entity);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("CREATE_CUSTOM_FEE", "TermCustomFee", entity.Id.ToString(),
            newValues: new { entity.Name, entity.Amount });

        return await GetCustomFeeDtoAsync(entity.Id);
    }

    public async Task<TermCustomFeeDto> UpdateCustomFeeAsync(int id, UpdateCustomFeeRequest request)
    {
        var entity = await _db.TermCustomFee.FindAsync(id)
            ?? throw new NotFoundException("TermCustomFee", id);

        var old = new { entity.Name, entity.Amount, entity.IsActive };

        entity.Name     = request.Name.Trim();
        entity.Amount   = request.Amount;
        entity.IsActive = request.IsActive;
        entity.SetApplicableMonthIds(request.ApplicableTermMonthIds);

        await _db.SaveChangesAsync();
        await _audit.LogAsync("UPDATE_CUSTOM_FEE", "TermCustomFee", id.ToString(),
            oldValues: old, newValues: new { entity.Name, entity.Amount, entity.IsActive });

        return await GetCustomFeeDtoAsync(id);
    }

    public async Task DeleteCustomFeeAsync(int id)
    {
        var entity = await _db.TermCustomFee.FindAsync(id)
            ?? throw new NotFoundException("TermCustomFee", id);

        _db.TermCustomFee.Remove(entity);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("DELETE_CUSTOM_FEE", "TermCustomFee", id.ToString());
    }

    public async Task<List<TermCustomFeeDto>> GetCustomFeesAsync(int termFeeId) =>
        await _db.TermCustomFee.AsNoTracking()
            .Where(c => c.TermFeeId == termFeeId)
            .OrderBy(c => c.Name)
            .Select(c => MapCustomFee(c))
            .ToListAsync();

    // ── Registration fee ─────────────────────────────────────────────────────

    public async Task<RegistrationFeeSettingDto> SetRegistrationFeeAsync(SetRegistrationFeeRequest request)
    {
        ValidateAmount(request.Amount, "registration fee");

        var existing = await _db.RegistrationFeeSetting
            .FirstOrDefaultAsync(r => r.AcademicYearId == request.AcademicYearId);

        if (existing is null)
        {
            existing = new RegistrationFeeSetting { AcademicYearId = request.AcademicYearId };
            _db.RegistrationFeeSetting.Add(existing);
        }

        existing.Amount = request.Amount;
        await _db.SaveChangesAsync();
        await _audit.LogAsync("SET_REGISTRATION_FEE", "RegistrationFeeSetting",
            existing.Id.ToString(), newValues: request);

        return await GetRegistrationFeeDtoAsync(existing.Id);
    }

    public async Task<RegistrationFeeSettingDto?> GetRegistrationFeeAsync(int academicYearId)
    {
        var entity = await _db.RegistrationFeeSetting.AsNoTracking()
            .Include(r => r.AcademicYear)
            .FirstOrDefaultAsync(r => r.AcademicYearId == academicYearId);

        return entity is null ? null
            : new RegistrationFeeSettingDto(entity.Id, entity.AcademicYearId,
                entity.AcademicYear.Name, entity.Amount);
    }

    // ── Report book ───────────────────────────────────────────────────────────

    public async Task<ReportBookSettingDto> SetReportBookFeeAsync(SetReportBookFeeRequest request)
    {
        ValidateAmount(request.Amount, "report book fee");

        var existing = await _db.ReportBookSetting
            .FirstOrDefaultAsync(r => r.AcademicYearId == request.AcademicYearId);

        if (existing is null)
        {
            existing = new ReportBookSetting { AcademicYearId = request.AcademicYearId };
            _db.ReportBookSetting.Add(existing);
        }

        existing.Amount = request.Amount;
        await _db.SaveChangesAsync();
        await _audit.LogAsync("SET_REPORT_BOOK_FEE", "ReportBookSetting",
            existing.Id.ToString(), newValues: request);

        return await GetReportBookFeeDtoAsync(existing.Id);
    }

    public async Task<ReportBookSettingDto?> GetReportBookFeeAsync(int academicYearId)
    {
        var entity = await _db.ReportBookSetting.AsNoTracking()
            .Include(r => r.AcademicYear)
            .FirstOrDefaultAsync(r => r.AcademicYearId == academicYearId);

        return entity is null ? null
            : new ReportBookSettingDto(entity.Id, entity.AcademicYearId,
                entity.AcademicYear.Name, entity.Amount);
    }

    // ── Admission fee ─────────────────────────────────────────────────────────

    public async Task<AdmissionFeeSettingDto> SetAdmissionFeeAsync(SetAdmissionFeeRequest request)
    {
        ValidateAmount(request.Amount, "admission fee");

        var existing = await _db.AdmissionFeeSetting
            .FirstOrDefaultAsync(a => a.AcademicYearId == request.AcademicYearId);

        if (existing is null)
        {
            existing = new AdmissionFeeSetting { AcademicYearId = request.AcademicYearId };
            _db.AdmissionFeeSetting.Add(existing);
        }

        existing.Amount = request.Amount;
        await _db.SaveChangesAsync();
        await _audit.LogAsync("SET_ADMISSION_FEE", "AdmissionFeeSetting",
            existing.Id.ToString(), newValues: request);

        return await GetAdmissionFeeDtoAsync(existing.Id);
    }

    public async Task<AdmissionFeeSettingDto?> GetAdmissionFeeAsync(int academicYearId)
    {
        var entity = await _db.AdmissionFeeSetting.AsNoTracking()
            .Include(a => a.AcademicYear)
            .FirstOrDefaultAsync(a => a.AcademicYearId == academicYearId);

        return entity is null ? null
            : new AdmissionFeeSettingDto(entity.Id, entity.AcademicYearId,
                entity.AcademicYear.Name, entity.Amount);
    }

    // ── Transport fee ─────────────────────────────────────────────────────────

    public async Task<TransportFeeSettingDto> SetTransportFeeAsync(SetTransportFeeRequest request)
    {
        ValidateAmount(request.MonthlyAmount, "transport fee");

        var existing = await _db.TransportFeeSetting
            .FirstOrDefaultAsync(t => t.AcademicYearId == request.AcademicYearId);

        if (existing is null)
        {
            existing = new TransportFeeSetting { AcademicYearId = request.AcademicYearId };
            _db.TransportFeeSetting.Add(existing);
        }

        existing.MonthlyAmount = request.MonthlyAmount;
        await _db.SaveChangesAsync();
        await _audit.LogAsync("SET_TRANSPORT_FEE", "TransportFeeSetting",
            existing.Id.ToString(), newValues: request);

        return await GetTransportFeeDtoAsync(existing.Id);
    }

    public async Task<TransportFeeSettingDto?> GetTransportFeeAsync(int academicYearId)
    {
        var entity = await _db.TransportFeeSetting.AsNoTracking()
            .Include(t => t.AcademicYear)
            .FirstOrDefaultAsync(t => t.AcademicYearId == academicYearId);

        return entity is null ? null
            : new TransportFeeSettingDto(entity.Id, entity.AcademicYearId,
                entity.AcademicYear.Name, entity.MonthlyAmount);
    }

    // ── Project fee ───────────────────────────────────────────────────────────

    public async Task<ProjectFeeSettingDto> SetProjectFeeAsync(SetProjectFeeRequest request)
    {
        ValidateAmount(request.Amount, "project fee");

        var existing = await _db.ProjectFeeSetting
            .FirstOrDefaultAsync(p => p.AcademicYearId == request.AcademicYearId);

        if (existing is null)
        {
            existing = new ProjectFeeSetting { AcademicYearId = request.AcademicYearId };
            _db.ProjectFeeSetting.Add(existing);
        }

        existing.Amount = request.Amount;
        await _db.SaveChangesAsync();
        await _audit.LogAsync("SET_PROJECT_FEE", "ProjectFeeSetting",
            existing.Id.ToString(), newValues: request);

        return await GetProjectFeeDtoAsync(existing.Id);
    }

    public async Task<ProjectFeeSettingDto?> GetProjectFeeAsync(int academicYearId)
    {
        var entity = await _db.ProjectFeeSetting.AsNoTracking()
            .Include(p => p.AcademicYear)
            .FirstOrDefaultAsync(p => p.AcademicYearId == academicYearId);

        return entity is null ? null
            : new ProjectFeeSettingDto(entity.Id, entity.AcademicYearId,
                entity.AcademicYear.Name, entity.Amount);
    }

    // ── Uniform items ─────────────────────────────────────────────────────────

    public async Task<UniformItemDto> CreateUniformItemAsync(CreateUniformItemRequest request)
    {
        ValidateAmount(request.Price, "uniform item price");

        if (!Enum.TryParse<UniformGender>(request.Gender, ignoreCase: true, out var gender))
            throw new ValidationException("gender", "Gender must be 'Boys', 'Girls', or 'Both'.");

        var entity = new UniformItem
        {
            Name     = request.Name.Trim(),
            Gender   = gender,
            Price    = request.Price,
            IsActive = true
        };

        _db.UniformItem.Add(entity);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("CREATE_UNIFORM_ITEM", "UniformItem", entity.Id.ToString(),
            newValues: new { entity.Name, entity.Gender, entity.Price });

        return MapUniformItem(entity);
    }

    public async Task<UniformItemDto> UpdateUniformItemAsync(int id, UpdateUniformItemRequest request)
    {
        var entity = await _db.UniformItem.FindAsync(id)
            ?? throw new NotFoundException("UniformItem", id);

        if (!Enum.TryParse<UniformGender>(request.Gender, ignoreCase: true, out var gender))
            throw new ValidationException("gender", "Gender must be 'Boys', 'Girls', or 'Both'.");

        var old = new { entity.Name, entity.Price, entity.IsActive };

        entity.Name     = request.Name.Trim();
        entity.Gender   = gender;
        entity.Price    = request.Price;
        entity.IsActive = request.IsActive;

        await _db.SaveChangesAsync();
        await _audit.LogAsync("UPDATE_UNIFORM_ITEM", "UniformItem", id.ToString(),
            oldValues: old, newValues: new { entity.Name, entity.Price, entity.IsActive });

        return MapUniformItem(entity);
    }

    public async Task<List<UniformItemDto>> GetUniformItemsAsync(bool activeOnly = true)
    {
        var query = _db.UniformItem.AsNoTracking().AsQueryable();
        if (activeOnly) query = query.Where(u => u.IsActive);
        return await query.OrderBy(u => u.Gender).ThenBy(u => u.Name)
            .Select(u => MapUniformItem(u))
            .ToListAsync();
    }

    // ── Trips ─────────────────────────────────────────────────────────────────

    public async Task<TripSettingDto> CreateTripAsync(CreateTripRequest request)
    {
        ValidateAmount(request.Amount, "trip amount");

        var term = await _db.Term.FindAsync(request.TermId)
            ?? throw new NotFoundException("Term", request.TermId);

        var entity = new TripSetting
        {
            TermId    = request.TermId,
            Name      = request.Name.Trim(),
            Amount    = request.Amount,
            IsActive  = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.TripSetting.Add(entity);
        await _db.SaveChangesAsync();
        await _audit.LogAsync("CREATE_TRIP", "TripSetting", entity.Id.ToString(),
    newValues: new { TripName = entity.Name, entity.Amount, TermName = term.Name });

        return await GetTripDtoAsync(entity.Id);
    }

    public async Task<TripSettingDto> UpdateTripAsync(int id, UpdateTripRequest request)
    {
        var entity = await _db.TripSetting.FindAsync(id)
            ?? throw new NotFoundException("TripSetting", id);

        var old = new { entity.Name, entity.Amount, entity.IsActive };

        entity.Name     = request.Name.Trim();
        entity.Amount   = request.Amount;
        entity.IsActive = request.IsActive;

        await _db.SaveChangesAsync();
        await _audit.LogAsync("UPDATE_TRIP", "TripSetting", id.ToString(),
            oldValues: old, newValues: new { entity.Name, entity.Amount, entity.IsActive });

        return await GetTripDtoAsync(id);
    }

    public async Task<List<TripSettingDto>> GetTripsAsync(int termId, bool activeOnly = false)
    {
        var query = _db.TripSetting.AsNoTracking()
            .Include(t => t.Term)
            .Where(t => t.TermId == termId);

        if (activeOnly) query = query.Where(t => t.IsActive);

        return await query.OrderByDescending(t => t.CreatedAt)
            .Select(t => MapTrip(t))
            .ToListAsync();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private static void ValidateAmount(decimal amount, string field)
    {
        if (amount < 0)
            throw new ValidationException(field, $"The {field} amount cannot be negative.");
    }

    private async Task<TermCustomFeeDto> GetCustomFeeDtoAsync(int id)
    {
        var c = await _db.TermCustomFee.AsNoTracking().FirstAsync(x => x.Id == id);
        return MapCustomFee(c);
    }

    private async Task<RegistrationFeeSettingDto> GetRegistrationFeeDtoAsync(int id)
    {
        var r = await _db.RegistrationFeeSetting.AsNoTracking()
            .Include(x => x.AcademicYear).FirstAsync(x => x.Id == id);
        return new RegistrationFeeSettingDto(r.Id, r.AcademicYearId, r.AcademicYear.Name, r.Amount);
    }

    private async Task<ReportBookSettingDto> GetReportBookFeeDtoAsync(int id)
    {
        var r = await _db.ReportBookSetting.AsNoTracking()
            .Include(x => x.AcademicYear).FirstAsync(x => x.Id == id);
        return new ReportBookSettingDto(r.Id, r.AcademicYearId, r.AcademicYear.Name, r.Amount);
    }

    private async Task<AdmissionFeeSettingDto> GetAdmissionFeeDtoAsync(int id)
    {
        var a = await _db.AdmissionFeeSetting.AsNoTracking()
            .Include(x => x.AcademicYear).FirstAsync(x => x.Id == id);
        return new AdmissionFeeSettingDto(a.Id, a.AcademicYearId, a.AcademicYear.Name, a.Amount);
    }

    private async Task<TransportFeeSettingDto> GetTransportFeeDtoAsync(int id)
    {
        var t = await _db.TransportFeeSetting.AsNoTracking()
            .Include(x => x.AcademicYear).FirstAsync(x => x.Id == id);
        return new TransportFeeSettingDto(t.Id, t.AcademicYearId, t.AcademicYear.Name, t.MonthlyAmount);
    }

    private async Task<ProjectFeeSettingDto> GetProjectFeeDtoAsync(int id)
    {
        var p = await _db.ProjectFeeSetting.AsNoTracking()
            .Include(x => x.AcademicYear).FirstAsync(x => x.Id == id);
        return new ProjectFeeSettingDto(p.Id, p.AcademicYearId, p.AcademicYear.Name, p.Amount);
    }

    private async Task<TripSettingDto> GetTripDtoAsync(int id)
    {
        var t = await _db.TripSetting.AsNoTracking()
            .Include(x => x.Term).FirstAsync(x => x.Id == id);
        return MapTrip(t);
    }

    private static TermCustomFeeDto MapCustomFee(TermCustomFee c) =>
        new(c.Id, c.TermFeeId, c.Name, c.Amount, c.GetApplicableMonthIds().ToList(), c.IsActive);

    private static UniformItemDto MapUniformItem(UniformItem u) =>
        new(u.Id, u.Name, u.Gender.ToString(), u.Price, u.IsActive);

    private static TripSettingDto MapTrip(TripSetting t) =>
        new(t.Id, t.TermId, t.Term?.Name ?? string.Empty, t.Name, t.Amount, t.IsActive, t.CreatedAt);
}
