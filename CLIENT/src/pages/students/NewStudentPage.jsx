/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCircleInfo } from "@fortawesome/free-solid-svg-icons";
import { useAppDispatch, useAppSelector, useToast } from "../../hooks";
import {
  createStudent,
  updateStudent,
  fetchStudentById,
  selectSelectedStudent,
} from "../../store/slices/studentsSlice";
import {
  fetchGrades,
  fetchYears,
  selectGrades,
  selectYears,
  fetchActiveTerm,
  fetchActiveYear,
  selectActiveTerm,
  selectActiveYear,
} from "../../store/slices/academicSlice";
import { validateStudentForm } from "../../utils/validators";
import { studentsApi } from "../../api/services";
import { GENDER_OPTIONS, ROUTES } from "../../utils/constants";
import { Card } from "../../components/ui/Card";
import { Input, Select, FormField } from "../../components/forms/FormControls";
import Button from "../../components/ui/Button";
import { Spinner } from "../../components/feedback/Loading";

function StudentForm({
  initialData = {},
  onSubmit,
  loading,
  submitLabel = "Save",
  isEdit = false,
}) {
  const grades = useAppSelector(selectGrades);
  const years = useAppSelector(selectYears);
  const activeTerm = useAppSelector(selectActiveTerm);

  const [form, setForm] = useState({
    firstName: "",
    surname: "",
    dateOfBirth: "",
    gender: "",
    guardianName: "",
    guardianPhone: "",
    guardianEmail: "",
    address: "",
    gradeId: "",
    academicYearId: "",
    startingTermMonthId: "",
    isStaffChild: false,
    guardianGroupId: "",
    owesAdmissionFee: false,
    skipsGrade6RegistrationArrear: false,
    ...initialData,
  });
  const [errors, setErrors] = useState({});
  const [phoneSuggestion, setPhoneSuggestion] = useState(null);
  const activeYear = useAppSelector(selectActiveYear);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Auto-suggest sibling group when guardian phone is entered
  useEffect(() => {
    const phone = form.guardianPhone?.trim();
    if (!phone || phone.length < 9 || !activeYear?.id) {
      setPhoneSuggestion(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await studentsApi.findByPhone(phone, activeYear.id);
        const matches = r?.data?.data ?? r?.data ?? [];
        if (matches.length > 0) setPhoneSuggestion(matches);
        else setPhoneSuggestion(null);
      } catch {
        setPhoneSuggestion(null);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [form.guardianPhone, activeYear?.id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validateStudentForm(form);
    if (Object.values(errs).some(Boolean)) {
      setErrors(errs);
      return;
    }
    onSubmit({
      ...form,
      startingTermMonthId: form.startingTermMonthId
        ? Number(form.startingTermMonthId)
        : null,
      guardianGroupId: form.guardianGroupId
        ? Number(form.guardianGroupId)
        : null,
      isStaffChild: !!form.isStaffChild,
      owesAdmissionFee: !!form.owesAdmissionFee,
      skipsGrade6RegistrationArrear: !!form.skipsGrade6RegistrationArrear,
    });
  };

  // Only show the starting month picker when enrolling a new student mid-term
  const termMonths = activeTerm?.months ?? [];
  const showMonthPicker = !isEdit && termMonths.length > 1;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Personal */}
        <div className="md:col-span-2">
          <p className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">
            Personal Details
          </p>
        </div>
        <FormField label="First Name" error={errors.firstName} required>
          <Input
            value={form.firstName}
            onChange={set("firstName")}
            error={errors.firstName}
          />
        </FormField>
        <FormField label="Surname" error={errors.surname} required>
          <Input
            value={form.surname}
            onChange={set("surname")}
            error={errors.surname}
          />
        </FormField>
        <FormField label="Date of Birth" error={errors.dateOfBirth} required>
          <Input
            type="date"
            value={form.dateOfBirth}
            onChange={set("dateOfBirth")}
            error={errors.dateOfBirth}
          />
        </FormField>
        <FormField label="Gender" error={errors.gender} required>
          <Select
            options={GENDER_OPTIONS}
            value={form.gender}
            onChange={set("gender")}
            error={errors.gender}
            placeholder="Select gender"
          />
        </FormField>

        {/* Academic */}
        <div className="md:col-span-2 mt-2">
          <p className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">
            Academic Placement
          </p>
        </div>
        <FormField label="Grade" error={errors.gradeId} required>
          <Select
            options={grades.map((g) => ({ value: g.id, label: g.name }))}
            value={form.gradeId}
            onChange={set("gradeId")}
            error={errors.gradeId}
            placeholder="Select grade"
          />
        </FormField>
        <FormField label="Academic Year" error={errors.academicYearId} required>
          <Select
            options={years.map((y) => ({ value: y.id, label: y.name }))}
            value={form.academicYearId}
            onChange={set("academicYearId")}
            error={errors.academicYearId}
            placeholder="Select year"
          />
        </FormField>

        {/* Mid-term enrollment — starting month */}
        {showMonthPicker && (
          <div className="md:col-span-2">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <FontAwesomeIcon
                  icon={faCircleInfo}
                  className="text-blue-500 mt-0.5 flex-shrink-0"
                />
                <div>
                  <p className="text-sm font-semibold text-blue-800">
                    Mid-term enrollment
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    If this student is joining partway through the current term
                    ({activeTerm.name}), select the month they start from. They
                    will <strong>not be charged</strong> for any months before
                    that. Leave blank if enrolling from the beginning of the
                    term.
                  </p>
                </div>
              </div>
              <FormField
                label="Starting from month"
                hint="Leave blank = full term fee applies"
              >
                <Select
                  options={[
                    { value: "", label: "Beginning of term (full fee)" },
                    ...termMonths.map((m) => ({
                      value: m.id,
                      label: m.monthName,
                    })),
                  ]}
                  value={form.startingTermMonthId}
                  onChange={set("startingTermMonthId")}
                  placeholder="Beginning of term (full fee)"
                />
              </FormField>
              {form.startingTermMonthId &&
                (() => {
                  const idx = termMonths.findIndex(
                    (m) => m.id === Number(form.startingTermMonthId),
                  );
                  const liable = termMonths.length - idx;
                  const skipped = idx;
                  return (
                    <p className="text-xs text-blue-700 font-medium">
                      ✓ Student will be charged for <strong>{liable}</strong>{" "}
                      month{liable !== 1 ? "s" : ""} (
                      {termMonths
                        .slice(idx)
                        .map((m) => m.monthName)
                        .join(", ")}
                      ).
                      {skipped > 0 &&
                        ` ${skipped} month${skipped !== 1 ? "s" : ""} (${termMonths
                          .slice(0, idx)
                          .map((m) => m.monthName)
                          .join(", ")}) will be marked N/A.`}
                    </p>
                  );
                })()}
            </div>
          </div>
        )}

        {/* Guardian */}
        <div className="md:col-span-2 mt-2">
          <p className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">
            Guardian / Contact
          </p>
        </div>
        <FormField label="Guardian Name" error={errors.guardianName} required>
          <Input
            value={form.guardianName}
            onChange={set("guardianName")}
            error={errors.guardianName}
          />
        </FormField>
        <FormField label="Guardian Phone" error={errors.guardianPhone} required>
          <Input
            type="tel"
            value={form.guardianPhone}
            onChange={set("guardianPhone")}
            error={errors.guardianPhone}
          />
        </FormField>
        <FormField label="Guardian Email" error={errors.guardianEmail}>
          <Input
            type="email"
            value={form.guardianEmail}
            onChange={set("guardianEmail")}
          />
        </FormField>
        <FormField label="Address">
          <Input value={form.address} onChange={set("address")} />
        </FormField>

        {/* Phone match suggestion */}
        {phoneSuggestion &&
          phoneSuggestion.length > 0 &&
          !form.guardianGroupId && (
            <SiblingGroupDialog
              siblings={phoneSuggestion}
              onUseGroup={(groupId) => {
                setForm((f) => ({ ...f, guardianGroupId: String(groupId) }));
                setPhoneSuggestion(null);
              }}
              onDismiss={() => setPhoneSuggestion(null)}
            />
          )}

        {/* Staff child / sibling */}
        <div className="md:col-span-2 mt-2">
          <p className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">
            Fee Rules
          </p>
        </div>
        <FormField
          label="Family / Sibling Group"
          hint="If this student has siblings already enrolled, enter their Family Group number here (find it on the sibling's profile). Click 'Auto-assign' to create a new group for new siblings."
        >
          <div className="flex gap-2 items-start">
            <Input
              type="number"
              min="1"
              value={form.guardianGroupId}
              onChange={set("guardianGroupId")}
              placeholder="Optional — same for siblings"
            />
            <button
              type="button"
              className="flex-shrink-0 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors whitespace-nowrap"
              onClick={async () => {
                try {
                  const { data } = await import("../../api/services").then(
                    (m) =>
                      m.studentsApi
                        ? Promise.resolve({ data: null })
                        : Promise.resolve({ data: null }),
                  );
                  // Fallback: use timestamp-based group ID if API not available
                  const newId = Math.floor(Date.now() / 1000) % 100000;
                  setForm((f) => ({ ...f, guardianGroupId: String(newId) }));
                } catch {
                  const newId = Math.floor(Date.now() / 1000) % 100000;
                  setForm((f) => ({ ...f, guardianGroupId: String(newId) }));
                }
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
              onChange={(e) =>
                setForm((f) => ({ ...f, isStaffChild: e.target.checked }))
              }
              className="w-4 h-4 rounded accent-blue-600"
            />
            <span className="text-sm text-slate-700">
              This student pays staff-child fee rates
            </span>
          </label>
        </FormField>

        {/* Admission fee — only relevant for genuinely new students, not bulk-enrolled */}
        {!isEdit && (
          <FormField
            label="Admission / Registration Fee"
            hint="Tick if this student must pay the admission fee. Leave unticked for existing students being entered into the system via bulk enrol."
          >
            <label className="flex items-center gap-3 mt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!form.owesAdmissionFee}
                onChange={(e) =>
                  setForm((f) => ({ ...f, owesAdmissionFee: e.target.checked }))
                }
                className="w-4 h-4 rounded accent-blue-600"
              />
              <span className="text-sm text-slate-700">
                Student owes admission fee at enrolment
              </span>
            </label>
            {form.owesAdmissionFee && (
              <p className="text-xs text-blue-600 mt-1 ml-7">
                ✓ Admission fee will appear on this student&apos;s first payment
                screen.
              </p>
            )}
          </FormField>
        )}

        {/* Edit view — show current admission fee status (read-only note) */}
        {isEdit && (
          <FormField
            label="Admission / Registration Fee"
            hint="To re-flag a student as owing admission fee, tick below. Only do this if the fee was incorrectly cleared."
          >
            <label className="flex items-center gap-3 mt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!form.owesAdmissionFee}
                onChange={(e) =>
                  setForm((f) => ({ ...f, owesAdmissionFee: e.target.checked }))
                }
                className="w-4 h-4 rounded accent-blue-600"
              />
              <span className="text-sm text-slate-700">
                Student still owes admission fee
              </span>
            </label>
            {!form.owesAdmissionFee && (
              <p className="text-xs text-emerald-600 mt-1 ml-7">
                ✓ Admission fee paid or not applicable.
              </p>
            )}
          </FormField>
        )}

        {/* Grade 6 registration arrear — shown for both new enrol and edit */}
        <FormField
          label="Grade 6 Registration Fee"
          hint="Tick if this student is enrolling directly into Grade 7 (or higher) and has never attended Grade 6 at this school. Prevents the system from charging a double registration fee as a Grade 6 arrear."
        >
          <label className="flex items-center gap-3 mt-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!form.skipsGrade6RegistrationArrear}
              onChange={(e) =>
                setForm((f) => ({ ...f, skipsGrade6RegistrationArrear: e.target.checked }))
              }
              className="w-4 h-4 rounded accent-blue-600"
            />
            <span className="text-sm text-slate-700">
              Student started at Grade 7 (skipped Grade 6 here)
            </span>
          </label>
          {!!form.skipsGrade6RegistrationArrear && (
            <p className="text-xs text-emerald-600 mt-1 ml-7">
              ✓ Registration fee will be charged once only — no Grade 6 arrear will be applied.
            </p>
          )}
        </FormField>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
        <Button
          type="button"
          variant="secondary"
          onClick={() => history.back()}
        >
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function SiblingGroupDialog({ siblings, onUseGroup, onDismiss }) {
  const [loading, setLoading] = useState(false);
  const [groupId, setGroupId] = useState(
    siblings.find(s => s.guardianGroupId)?.guardianGroupId ?? null
  );

  const handleLink = async () => {
    if (groupId) { onUseGroup(groupId); return; }
    // No group exists yet — assign one now to all siblings
    setLoading(true);
    try {
      const ids = siblings.map(s => s.studentId);
      const r = await studentsApi.assignSiblingGroup(ids);
      const newId = r?.data?.data?.groupId ?? r?.data?.groupId;
      setGroupId(newId);
      onUseGroup(newId);
    } catch (e) {
      // Fallback: generate locally
      const fallback = Math.floor(Date.now() / 1000) % 100000;
      onUseGroup(fallback);
    } finally {
      setLoading(false);
    }
  };

  const siblingCount = siblings.length;
  const willGetDiscount = siblingCount >= 2; // 3 total including new one

  return (
    <div className="md:col-span-2 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
      <p className="font-semibold text-amber-800 mb-3">
        ⚠️ Existing students found with this guardian phone number:
      </p>

      <div className="space-y-1.5 mb-3">
        {siblings.map(s => (
          <div key={s.studentId} className="flex items-center gap-2 text-amber-700">
            <span className="font-mono text-xs bg-amber-100 px-1.5 py-0.5 rounded">{s.studentNumber}</span>
            <span className="font-semibold">{s.fullName}</span>
            <span className="text-xs text-amber-500">({s.gradeName})</span>
            {s.guardianGroupId
              ? <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-mono">Group #{s.guardianGroupId}</span>
              : <span className="text-xs text-amber-400 italic">no group yet</span>
            }
          </div>
        ))}
      </div>

      {groupId ? (
        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg text-green-800 text-xs font-semibold">
          ✓ Family Group #{groupId} will be used for this student.
          {willGetDiscount && ' With this new sibling, the oldest-grade child will receive the sibling discount.'}
        </div>
      ) : (
        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-xs">
          These siblings don't have a group number yet. Click <strong>"Link as siblings"</strong> to assign one to all of them and this new student.
          {willGetDiscount && <span className="block mt-1 font-semibold">With this new sibling (3 total), the child in the highest grade will automatically get the sibling discount.</span>}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={handleLink} disabled={loading}
          className="px-4 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">
          {loading ? 'Assigning…' : groupId ? `Use Group #${groupId}` : 'Link as siblings & assign group'}
        </button>
        <button type="button" onClick={onDismiss}
          className="px-4 py-1.5 text-xs font-semibold bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50">
          Not siblings — dismiss
        </button>
      </div>
    </div>
  );
}

// ─── New Student ──────────────────────────────────────────────────────────────
export function NewStudentPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchGrades());
    dispatch(fetchYears());
    dispatch(fetchActiveTerm());
    dispatch(fetchActiveYear());
  }, [dispatch]);

  const handleSubmit = async (data) => {
    setLoading(true);
    const res = await dispatch(createStudent(data));
    setLoading(false);
    if (createStudent.fulfilled.match(res)) {
      toast.success(
        `${res.payload.firstName} ${res.payload.surname} enrolled.`,
      );
      navigate(ROUTES.STUDENT(res.payload.id));
    } else {
      toast.error("Failed to enrol student.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Enrol New Student
          </h1>
          <p className="text-sm text-slate-500">
            Fill in all required fields to create a student record.
          </p>
        </div>
      </div>
      <Card>
        <StudentForm
          onSubmit={handleSubmit}
          loading={loading}
          submitLabel="Enrol Student"
        />
      </Card>
    </div>
  );
}

// ─── Edit Student ─────────────────────────────────────────────────────────────
export function EditStudentPage() {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const student = useAppSelector(selectSelectedStudent);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchGrades());
    dispatch(fetchYears());
    dispatch(fetchStudentById(Number(id)));
  }, [dispatch, id]);

  const handleSubmit = async (data) => {
    setLoading(true);
    const res = await dispatch(updateStudent({ id: Number(id), data }));
    setLoading(false);
    if (updateStudent.fulfilled.match(res)) {
      toast.success("Student updated.");
      navigate(ROUTES.STUDENT(id));
    } else {
      toast.error("Failed to update student.");
    }
  };

  if (!student)
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Edit Student</h1>
          <p className="text-sm text-slate-500">
            {student.firstName} {student.surname}
          </p>
        </div>
      </div>
      <Card>
        <StudentForm
          isEdit
          initialData={{
            ...student,
            dateOfBirth: student.dateOfBirth?.split("T")[0] ?? "",
            gradeId: student.gradeId ?? "",
            academicYearId: student.academicYearId ?? "",
            isStaffChild: !!student.isStaffChild,
            guardianGroupId: student.guardianGroupId ?? "",
            owesAdmissionFee: !!student.owesAdmissionFee,
            skipsGrade6RegistrationArrear: !!student.skipsGrade6RegistrationArrear,
          }}
          onSubmit={handleSubmit}
          loading={loading}
          submitLabel="Save Changes"
        />
      </Card>
    </div>
  );
}

export default NewStudentPage;
