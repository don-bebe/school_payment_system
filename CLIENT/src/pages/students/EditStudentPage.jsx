import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPen } from '@fortawesome/free-solid-svg-icons';
import { useAppDispatch, useAppSelector, useToast } from '../../hooks';
import {
  updateStudent, fetchStudentById,
  selectSelectedStudent, selectStudentsLoading,
} from '../../store/slices/studentsSlice';
import {
  fetchGrades, fetchYears,
  selectGrades, selectYears,
} from '../../store/slices/academicSlice';
import { validateStudentForm } from '../../utils/validators';
import { GENDER_OPTIONS, ROUTES } from '../../utils/constants';
import { Card } from '../../components/ui/Card';
import { Input, Select, FormField } from '../../components/forms/FormControls';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/feedback/Loading';
import { fullName, toInputDate } from '../../utils/formatters';

function StudentForm({ initialData = {}, onSubmit, loading }) {
  const grades = useAppSelector(selectGrades);
  const years  = useAppSelector(selectYears);

  const [form, setForm] = useState({
    firstName: '', surname: '', dateOfBirth: '', gender: '',
    guardianName: '', guardianPhone: '', guardianEmail: '', address: '',
    gradeId: '', academicYearId: '',
    isStaffChild: false, guardianGroupId: '', owesAdmissionFee: false, skipsGrade6RegistrationArrear: false,
    ...initialData,
  });
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setErrors(er => ({ ...er, [k]: null }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validateStudentForm(form);
    if (Object.values(errs).some(Boolean)) { setErrors(errs); return; }
    onSubmit({
      ...form,
      guardianGroupId:  form.guardianGroupId ? Number(form.guardianGroupId) : null,
      isStaffChild:     !!form.isStaffChild,
      owesAdmissionFee: !!form.owesAdmissionFee,
      skipsGrade6RegistrationArrear: !!form.skipsGrade6RegistrationArrear,
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Personal */}
        <div className="md:col-span-2">
          <p className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">Personal Details</p>
        </div>
        <FormField label="First Name" error={errors.firstName} required>
          <Input value={form.firstName} onChange={set('firstName')} error={errors.firstName} placeholder="e.g. Tendai" />
        </FormField>
        <FormField label="Surname" error={errors.surname} required>
          <Input value={form.surname} onChange={set('surname')} error={errors.surname} placeholder="e.g. Moyo" />
        </FormField>
        <FormField label="Date of Birth" error={errors.dateOfBirth} required>
          <Input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} error={errors.dateOfBirth} />
        </FormField>
        <FormField label="Gender" error={errors.gender} required>
          <Select options={GENDER_OPTIONS} value={form.gender} onChange={set('gender')} error={errors.gender} placeholder="Select gender" />
        </FormField>

        {/* Academic */}
        <div className="md:col-span-2 mt-2">
          <p className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">Academic Placement</p>
        </div>
        <FormField label="Grade" error={errors.gradeId} required>
          <Select
            options={grades.map(g => ({ value: g.id, label: g.name }))}
            value={form.gradeId} onChange={set('gradeId')}
            error={errors.gradeId} placeholder="Select grade"
          />
        </FormField>
        <FormField label="Academic Year" error={errors.academicYearId} required>
          <Select
            options={years.map(y => ({ value: y.id, label: y.name }))}
            value={form.academicYearId} onChange={set('academicYearId')}
            error={errors.academicYearId} placeholder="Select year"
          />
        </FormField>

        {/* Guardian */}
        <div className="md:col-span-2 mt-2">
          <p className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">Guardian / Contact</p>
        </div>
        <FormField label="Guardian Name" error={errors.guardianName} required>
          <Input value={form.guardianName} onChange={set('guardianName')} error={errors.guardianName} />
        </FormField>
        <FormField label="Guardian Phone" error={errors.guardianPhone} required>
          <Input type="tel" value={form.guardianPhone} onChange={set('guardianPhone')} error={errors.guardianPhone} placeholder="e.g. 0771 234 567" />
        </FormField>
        <FormField label="Guardian Email" error={errors.guardianEmail}>
          <Input type="email" value={form.guardianEmail} onChange={set('guardianEmail')} placeholder="Optional" />
        </FormField>
        <FormField label="Home Address">
          <Input value={form.address} onChange={set('address')} placeholder="Optional" />
        </FormField>

        {/* Fee Rules */}
        <div className="md:col-span-2 mt-2">
          <p className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">Fee Rules</p>
        </div>

        <FormField label="Guardian Group ID" hint="Leave blank for a solo student. Siblings share the same group number.">
          <div className="flex gap-2 items-start">
            <Input
              type="number" min="1"
              value={form.guardianGroupId}
              onChange={set('guardianGroupId')}
              placeholder="Optional — same for siblings"
            />
            <button
              type="button"
              className="flex-shrink-0 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors whitespace-nowrap"
              onClick={() => {
                const newId = Math.floor(Date.now() / 1000) % 100000;
                setForm(f => ({ ...f, guardianGroupId: String(newId) }));
              }}
            >
              Auto-assign
            </button>
          </div>
        </FormField>

        <FormField label="Staff Child">
          <label className="flex items-center gap-3 mt-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!form.isStaffChild}
              onChange={e => setForm(f => ({ ...f, isStaffChild: e.target.checked }))}
              className="w-4 h-4 rounded accent-blue-600"
            />
            <span className="text-sm text-slate-700">This student pays staff-child fee rates</span>
          </label>
        </FormField>

        <FormField
          label="Admission / Registration Fee"
          hint="Tick if this student still owes the admission fee. It will appear on their next payment screen and auto-clear once paid."
        >
          <label className="flex items-center gap-3 mt-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!form.owesAdmissionFee}
              onChange={e => setForm(f => ({ ...f, owesAdmissionFee: e.target.checked }))}
              className="w-4 h-4 rounded accent-blue-600"
            />
            <span className="text-sm text-slate-700">Student still owes admission fee</span>
          </label>
          {!form.owesAdmissionFee && (
            <p className="text-xs text-emerald-600 mt-1 ml-7">✓ Admission fee paid or not applicable.</p>
          )}
          {!!form.owesAdmissionFee && (
            <p className="text-xs text-blue-600 mt-1 ml-7">Admission fee will appear on this student's next payment screen.</p>
          )}
        </FormField>

        <FormField
          label="Grade 6 Registration Fee"
          hint="Tick if this student enrolled directly into Grade 7 (or higher) and never attended Grade 6 here. This prevents the system from incorrectly charging a double registration fee as a Grade 6 arrear."
        >
          <label className="flex items-center gap-3 mt-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!form.skipsGrade6RegistrationArrear}
              onChange={e => setForm(f => ({ ...f, skipsGrade6RegistrationArrear: e.target.checked }))}
              className="w-4 h-4 rounded accent-blue-600"
            />
            <span className="text-sm text-slate-700">Student started at Grade 7 (skipped Grade 6 here)</span>
          </label>
          {!!form.skipsGrade6RegistrationArrear && (
            <p className="text-xs text-emerald-600 mt-1 ml-7">✓ Registration fee will be charged once only — no Grade 6 arrear applied.</p>
          )}
        </FormField>

      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
        <Button type="button" variant="secondary" onClick={() => window.history.back()}>Cancel</Button>
        <Button type="submit" loading={loading} icon={faPen}>Save Changes</Button>
      </div>
    </form>
  );
}

export default function EditStudentPage() {
  const { id }   = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast    = useToast();
  const student  = useAppSelector(selectSelectedStudent);
  const fetching = useAppSelector(selectStudentsLoading);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchGrades());
    dispatch(fetchYears());
    dispatch(fetchStudentById(Number(id)));
  }, [dispatch, id]);

  const handleSubmit = async (data) => {
    setSaving(true);
    const res = await dispatch(updateStudent({ id: Number(id), data }));
    setSaving(false);
    if (updateStudent.fulfilled.match(res)) {
      toast.success('Student updated successfully.');
      navigate(ROUTES.STUDENT(id));
    } else {
      toast.error(res.payload ?? 'Failed to update student. Please try again.');
    }
  };

  if (fetching && !student) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Spinner size="xl" />
        <p className="text-sm text-slate-500">Loading student record…</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-20 text-slate-500">
        Student not found.{' '}
        <button onClick={() => navigate(-1)} className="text-blue-500 hover:underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(ROUTES.STUDENT(id))}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          title="Back to student profile"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Edit Student</h1>
          <p className="text-sm text-slate-500">{fullName(student)} · {student.studentNumber}</p>
        </div>
      </div>
      <Card>
        <StudentForm
          initialData={{
            ...student,
            dateOfBirth:      toInputDate(student.dateOfBirth),
            gradeId:          student.gradeId          ?? '',
            academicYearId:   student.academicYearId   ?? '',
            isStaffChild:     !!student.isStaffChild,
            guardianGroupId:  student.guardianGroupId  ?? '',
            owesAdmissionFee: !!student.owesAdmissionFee,
            skipsGrade6RegistrationArrear: !!student.skipsGrade6RegistrationArrear,
          }}
          onSubmit={handleSubmit}
          loading={saving}
        />
      </Card>
    </div>
  );
}
