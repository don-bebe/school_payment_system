using SchoolPaymentSystem.DTO.Reports;

namespace SchoolPaymentSystem.Services.Interfaces;

public interface IReportService
{
    Task<DailyReportDto>             GetDailyReportAsync(DailyReportRequest request);
    Task<DailyReportDto>             GetRangeReportAsync(DateRangeReportRequest request);
    Task<ArrearsReportDto>           GetArrearsReportAsync(ArrearsReportRequest request);
    Task<List<TransportPaymentRow>>  GetTransportReportAsync(TransportReportRequest request);
    Task<List<TripPaymentRow>>       GetTripReportAsync(TripReportRequest request);
    Task<List<TransferLogRow>>       GetTransferLogAsync(DateTime? from, DateTime? to);
    Task<List<UniformSalesRow>>      GetUniformSalesAsync(UniformSalesRequest request);
    Task<StudentStatementDto>        GetStudentStatementAsync(int studentId, int? academicYearId);
    Task<List<StandaloneFeeRow>>     GetStandaloneFeesReportAsync(StandaloneFeesReportRequest request);
}
