import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faUserPlus, faTrash, faCircleCheck, faCircleXmark } from '@fortawesome/free-solid-svg-icons';
import { useAppDispatch, useAppSelector, useToast } from '../../hooks';
import { bulkEnrolStudents, selectStudentsLoading } from '../../store/slices/studentsSlice';
import { fetchGrades, fetchYears, fetchActiveTerm, selectGrades, selectYears, selectActiveTerm } from '../../store/slices/academicSlice';
import { Card, CardHeader } from '../../components/ui/Card';
import { Select } from '../../components/forms/FormControls';
import Button from '../../components/ui/Button';
import { GENDER_OPTIONS } from '../../utils/constants';

const EMPTY_ROW = () => ({
  firstName: '', surname: '', dateOfBirth: '', gender: 'Male',
  guardianName: '', guardianPhone: '', gradeId: '',
  isStaffChild: false, guardianGroupId: '',
});

export default function BulkEnrolPage() {
  const dispatch   = useAppDispatch();
  const navigate   = useNavigate();
  const toast      = useToast();
  const loading    = useAppSelector(selectStudentsLoading);
  const grades     = useAppSelector(selectGrades);
  const years      = useAppSelector(selectYears);
  const activeTerm = useAppSelector(selectActiveTerm);

  const [rows,      setRows]      = useState(() => Array.from({ length: 5 }, EMPTY_ROW));
  const [yearId,    setYearId]    = useState('');
  const [result,    setResult]    = useState(null);

  useEffect(() => {
    dispatch(fetchGrades());
    dispatch(fetchYears());
    dispatch(fetchActiveTerm());
  }, [dispatch]);

  // Pre-select active year once loaded
  useEffect(() => {
    if (!yearId && years.length) {
      const active = years.find(y => y.isActive);
      if (active) setYearId(String(active.id));
    }
  }, [years, yearId]);

  const setRow = (i, field, value) =>
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));

  const addRow = () => {
    if (rows.length < 10) setRows(prev => [...prev, EMPTY_ROW()]);
  };

  const removeRow = (i) => setRows(prev => prev.filter((_, idx) => idx !== i));

  const nonEmptyRows = rows.filter(r => r.firstName.trim() && r.surname.trim());

  const handleSave = async () => {
    if (!yearId) { toast.error('Please select an academic year.'); return; }
    if (!nonEmptyRows.length) { toast.error('Please fill in at least one student row.'); return; }

    const missingGrade = nonEmptyRows.find(r => !r.gradeId);
    if (missingGrade) {
      toast.error(`Please select a grade for ${missingGrade.firstName} ${missingGrade.surname}.`);
      return;
    }

    const payload = {
      academicYearId:      Number(yearId),
      startingTermMonthId: null,
      students: nonEmptyRows.map(r => ({
        firstName:      r.firstName.trim(),
        surname:        r.surname.trim(),
        dateOfBirth:    r.dateOfBirth || '2000-01-01',
        gender:         r.gender,
        guardianName:   r.guardianName.trim() || 'Unknown',
        guardianPhone:  r.guardianPhone.trim() || '0000000000',
        guardianEmail:  null,
        gradeId:        Number(r.gradeId),
        isStaffChild:   r.isStaffChild,
        guardianGroupId: r.guardianGroupId ? Number(r.guardianGroupId) : null,
      })),
    };

    const res = await dispatch(bulkEnrolStudents(payload));
    if (bulkEnrolStudents.fulfilled.match(res)) {
      setResult(res.payload);
      toast.success(`Enrolled ${res.payload.enrolled} student(s).`);
    } else {
      toast.error(res.payload ?? 'Bulk enrolment failed.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bulk Enrol Students</h1>
          <p className="text-sm text-slate-500">Enrol up to 10 students in one save</p>
        </div>
      </div>

      {/* Result panel */}
      {result && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-500" />
            <span className="font-semibold text-slate-800">
              {result.enrolled} enrolled, {result.skipped} skipped
            </span>
          </div>
          {result.skippedReasons.length > 0 && (
            <ul className="space-y-1">
              {result.skippedReasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-600">
                  <FontAwesomeIcon icon={faCircleXmark} className="mt-0.5 flex-shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => { setResult(null); setRows(Array.from({ length: 5 }, EMPTY_ROW)); }}>
              Enrol more
            </Button>
            <Button size="sm" onClick={() => navigate('/students')}>
              View students
            </Button>
          </div>
        </Card>
      )}

      {!result && (
        <>
          {/* Year selector */}
          <Card>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Academic Year</label>
              <div className="w-48">
                <Select
                  options={years.map(y => ({ value: y.id, label: y.name }))}
                  value={yearId}
                  onChange={e => setYearId(e.target.value)}
                  placeholder="Select year"
                />
              </div>
              <p className="text-xs text-slate-400">Blank rows are ignored on save.</p>
            </div>
          </Card>

          {/* Grid */}
          <Card padding="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500 font-semibold uppercase tracking-wide">
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">First Name *</th>
                    <th className="px-3 py-2 text-left">Surname *</th>
                    <th className="px-3 py-2 text-left">DOB</th>
                    <th className="px-3 py-2 text-left">Gender</th>
                    <th className="px-3 py-2 text-left">Grade *</th>
                    <th className="px-3 py-2 text-left">Guardian Name</th>
                    <th className="px-3 py-2 text-left">Guardian Phone</th>
                    <th className="px-2 py-2 text-center">Staff Child</th>
                    <th className="px-2 py-2 text-center">Group ID</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-1.5 text-slate-400 font-mono text-xs">{i + 1}</td>
                      <td className="px-1 py-1">
                        <input value={row.firstName} onChange={e => setRow(i, 'firstName', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                          placeholder="First name" />
                      </td>
                      <td className="px-1 py-1">
                        <input value={row.surname} onChange={e => setRow(i, 'surname', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                          placeholder="Surname" />
                      </td>
                      <td className="px-1 py-1">
                        <input type="date" value={row.dateOfBirth} onChange={e => setRow(i, 'dateOfBirth', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-300" />
                      </td>
                      <td className="px-1 py-1">
                        <select value={row.gender} onChange={e => setRow(i, 'gender', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-300">
                          {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1">
                        <select value={row.gradeId} onChange={e => setRow(i, 'gradeId', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-300">
                          <option value="">— Grade —</option>
                          {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1">
                        <input value={row.guardianName} onChange={e => setRow(i, 'guardianName', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                          placeholder="Guardian name" />
                      </td>
                      <td className="px-1 py-1">
                        <input value={row.guardianPhone} onChange={e => setRow(i, 'guardianPhone', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                          placeholder="Phone" />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <input type="checkbox" checked={row.isStaffChild}
                          onChange={e => setRow(i, 'isStaffChild', e.target.checked)}
                          className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                      </td>
                      <td className="px-1 py-1">
                        <input type="number" value={row.guardianGroupId} onChange={e => setRow(i, 'guardianGroupId', e.target.value)}
                          className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-300"
                          placeholder="—" min="1" />
                      </td>
                      <td className="px-2 py-1">
                        <button type="button" onClick={() => removeRow(i)}
                          className="text-slate-300 hover:text-red-400 transition-colors">
                          <FontAwesomeIcon icon={faTrash} className="text-xs" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add row + save */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <button type="button" onClick={addRow} disabled={rows.length >= 10}
                className="text-sm text-blue-500 hover:text-blue-700 disabled:opacity-40 flex items-center gap-1">
                <FontAwesomeIcon icon={faUserPlus} className="text-xs" />
                Add row {rows.length < 10 ? `(${10 - rows.length} remaining)` : '(max reached)'}
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">{nonEmptyRows.length} student{nonEmptyRows.length !== 1 ? 's' : ''} to enrol</span>
                <Button onClick={handleSave} loading={loading} icon={faUserPlus}
                  disabled={!nonEmptyRows.length || !yearId}>
                  Save All
                </Button>
              </div>
            </div>
          </Card>

          {/* Guardian Group ID help */}
          <p className="text-xs text-slate-400 px-1">
            <strong>Group ID:</strong> Enter the same number for siblings who share a guardian.
            When 3+ siblings are enrolled, the highest-grade child automatically receives staff-child fee rates.
          </p>
        </>
      )}
    </div>
  );
}
