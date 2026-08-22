using SchoolPaymentSystem.DTO.Admin;
using SchoolPaymentSystem.DTO.Student;

namespace SchoolPaymentSystem.Services.Interfaces;

public interface IStudentService
{
    Task<StudentDto>                       CreateAsync(CreateStudentRequest request);
    Task<StudentDto>                       UpdateAsync(int id, UpdateStudentRequest request);
    Task                                   DeactivateAsync(int id, DeactivateStudentRequest request);
    Task<BulkEnrolResultDto>               BulkEnrolAsync(BulkEnrolRequest request);
    Task<StudentDto>                       GetByIdAsync(int id);
    Task<StudentDto>                       GetByStudentNumberAsync(string number);
    Task<PagedResult<StudentWithGradeDto>> SearchAsync(StudentSearchRequest request);
    Task<List<StudentGradeViewRow>>        GetGradeViewAsync(int gradeId, int termId, int academicYearId);
    Task                                   PromoteStudentsAsync(int fromYearId, int toYearId);
    Task<int>                              AssignSiblingGroupAsync(List<int> studentIds);
    Task<List<GraduatedStudentDto>>        GetGraduatedWithBalanceAsync();
    Task                                   ClearArrearsAsync(int studentId, ClearArrearsRequest request);
}