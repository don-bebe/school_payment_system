using SchoolPaymentSystem.DTO.Fees;
using SchoolPaymentSystem.DTO.Grade;

namespace SchoolPaymentSystem.Services.Interfaces;

public interface IFeeSettingService
{
    // ── Core term fee — custom components ────────────────────────────────────
    Task<TermCustomFeeDto>       CreateCustomFeeAsync(CreateCustomFeeRequest request);
    Task<TermCustomFeeDto>       UpdateCustomFeeAsync(int id, UpdateCustomFeeRequest request);
    Task                         DeleteCustomFeeAsync(int id);
    Task<List<TermCustomFeeDto>> GetCustomFeesAsync(int termFeeId);

    // ── Registration fee ─────────────────────────────────────────────────────
    Task<RegistrationFeeSettingDto>  SetRegistrationFeeAsync(SetRegistrationFeeRequest request);
    Task<RegistrationFeeSettingDto?> GetRegistrationFeeAsync(int academicYearId);

    // ── Report book ───────────────────────────────────────────────────────────
    Task<ReportBookSettingDto>  SetReportBookFeeAsync(SetReportBookFeeRequest request);
    Task<ReportBookSettingDto?> GetReportBookFeeAsync(int academicYearId);

    // ── Admission fee ─────────────────────────────────────────────────────────
    Task<AdmissionFeeSettingDto>  SetAdmissionFeeAsync(SetAdmissionFeeRequest request);
    Task<AdmissionFeeSettingDto?> GetAdmissionFeeAsync(int academicYearId);

    // ── Transport fee ─────────────────────────────────────────────────────────
    Task<TransportFeeSettingDto>  SetTransportFeeAsync(SetTransportFeeRequest request);
    Task<TransportFeeSettingDto?> GetTransportFeeAsync(int academicYearId);

    // ── Project fee ───────────────────────────────────────────────────────────
    Task<ProjectFeeSettingDto>  SetProjectFeeAsync(SetProjectFeeRequest request);
    Task<ProjectFeeSettingDto?> GetProjectFeeAsync(int academicYearId);

    // ── Uniform items ─────────────────────────────────────────────────────────
    Task<UniformItemDto>       CreateUniformItemAsync(CreateUniformItemRequest request);
    Task<UniformItemDto>       UpdateUniformItemAsync(int id, UpdateUniformItemRequest request);
    Task<List<UniformItemDto>> GetUniformItemsAsync(bool activeOnly = true);

    // ── Trips ─────────────────────────────────────────────────────────────────
    Task<TripSettingDto>       CreateTripAsync(CreateTripRequest request);
    Task<TripSettingDto>       UpdateTripAsync(int id, UpdateTripRequest request);
    Task<List<TripSettingDto>> GetTripsAsync(int termId, bool activeOnly = false);
}
