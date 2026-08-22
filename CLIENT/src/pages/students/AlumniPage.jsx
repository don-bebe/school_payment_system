import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faGraduationCap, faEraser, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import { useAppDispatch, useAppSelector, useToast } from '../../hooks';
import { fetchGraduated, clearStudentArrears, selectGraduated, selectStudentsLoading } from '../../store/slices/studentsSlice';
import { SectionHeader, Card } from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import { formatCurrency } from '../../utils/formatters';
import { ROUTES } from '../../utils/constants';

const REASON_OPTIONS = [
  'Student graduated — debt forgiven',
  'Deceased — debt cleared',
  'Transferred — debt settled externally',
  'Error correction',
  'Other',
];

function ClearArrearsModal({ student, onConfirm, onClose, loading }) {
  const [reason, setReason] = useState(REASON_OPTIONS[0]);
  const [notes,  setNotes]  = useState('');

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Clear Arrears</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800">{student.fullName}</p>
            <p className="text-xs text-amber-700 mt-0.5">{student.studentNumber} · {student.lastGrade} · {student.lastYear}</p>
            <p className="text-lg font-bold text-red-600 mt-2">{formatCurrency(student.balance)} outstanding</p>
          </div>

          <p className="text-xs text-slate-500">
            This will write off <strong>{formatCurrency(student.balance)}</strong> in tuition arrears.
            The amount will <strong>not</strong> appear in income reports — it is recorded as a write-off only.
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason <span className="text-red-500">*</span></label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {REASON_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Additional notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Approved by head teacher on 12 Apr 2026"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <Button
            onClick={() => onConfirm({ reason, notes: notes || undefined })}
            loading={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Write Off {formatCurrency(student.balance)}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AlumniPage() {
  const dispatch  = useAppDispatch();
  const navigate  = useNavigate();
  const toast     = useToast();
  const rows      = useAppSelector(selectGraduated);
  const loading   = useAppSelector(selectStudentsLoading);

  const [clearing,       setClearing]       = useState(null);   // student being cleared
  const [clearingLoading, setClearingLoading] = useState(false);
  const [search,         setSearch]         = useState('');
  const [filterStatus,   setFilterStatus]   = useState('all');  // 'all' | 'owing' | 'settled'

  useEffect(() => { dispatch(fetchGraduated()); }, [dispatch]);

  const handleClearArrears = async ({ reason, notes }) => {
    setClearingLoading(true);
    try {
      const res = await dispatch(clearStudentArrears({
        studentId: clearing.studentId,
        data: { reason, notes },
      }));
      if (clearStudentArrears.fulfilled.match(res)) {
        toast.success(`Arrears cleared for ${clearing.fullName}.`);
        dispatch(fetchGraduated());
        setClearing(null);
      } else {
        toast.error(res.payload ?? 'Failed to clear arrears.');
      }
    } finally {
      setClearingLoading(false);
    }
  };

  // Filtering
  const visible = rows.filter(r => {
    const matchSearch = !search ||
      r.fullName.toLowerCase().includes(search.toLowerCase()) ||
      r.studentNumber.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === 'all'     ? true :
      filterStatus === 'owing'   ? r.balance > 0 :
      /* settled */                r.balance === 0;
    return matchSearch && matchStatus;
  });

  const totalOwing   = rows.filter(r => r.balance > 0).length;
  const totalSettled = rows.filter(r => r.balance === 0).length;
  const totalBalance = rows.reduce((s, r) => s + r.balance, 0);

  const COLS = [
    {
      key: 'fullName',
      label: 'Student',
      render: r => (
        <div>
          <p className="font-semibold text-slate-800 text-sm">{r.fullName}</p>
          <p className="text-xs text-slate-400 font-mono">{r.studentNumber}</p>
        </div>
      ),
    },
    { key: 'lastGrade', label: 'Last Grade' },
    { key: 'lastYear',  label: 'Year' },
    {
      key: 'deactivationReason',
      label: 'Status',
      render: r => {
        const colors = {
          Graduated:   'bg-purple-100 text-purple-700',
          Transferred: 'bg-blue-100 text-blue-700',
          Deceased:    'bg-slate-100 text-slate-500',
        };
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[r.deactivationReason] ?? 'bg-slate-100 text-slate-500'}`}>
            {r.deactivationReason === 'Graduated' ? '🎓 ' : ''}{r.deactivationReason}
          </span>
        );
      },
    },
    {
      key: 'totalPaid',
      label: 'Paid',
      align: 'right',
      render: r => <span className="text-emerald-700 font-mono text-xs">{formatCurrency(r.totalPaid)}</span>,
    },
    {
      key: 'balance',
      label: 'Balance',
      align: 'right',
      render: r => r.balance > 0
        ? <span className="text-red-600 font-bold font-mono text-xs">{formatCurrency(r.balance)}</span>
        : r.hasWrittenOff
          ? <span className="text-slate-400 text-xs">Written off</span>
          : <span className="text-emerald-600 font-medium text-xs">Settled</span>,
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: r => (
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => navigate(`/reports/statement/${r.studentId}`)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            <FontAwesomeIcon icon={faFileAlt} className="text-[10px]" />
            Statement
          </button>
          {r.balance > 0 && (
            <button
              onClick={() => setClearing(r)}
              className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
            >
              <FontAwesomeIcon icon={faEraser} className="text-[10px]" />
              Clear
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-8">
      {clearing && (
        <ClearArrearsModal
          student={clearing}
          onConfirm={handleClearArrears}
          onClose={() => setClearing(null)}
          loading={clearingLoading}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(ROUTES.STUDENTS)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <SectionHeader
          title="Alumni & Inactive Students"
          subtitle={`${rows.length} students · ${totalOwing} with outstanding balance`}
        />
      </div>

      {/* Summary cards */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { l: 'Total Alumni',     v: rows.length,                    c: 'text-slate-800'    },
            { l: 'With Arrears',     v: totalOwing,                     c: 'text-red-600'      },
            { l: 'Settled',          v: totalSettled,                   c: 'text-emerald-600'  },
            { l: 'Total Outstanding',v: formatCurrency(totalBalance),   c: 'text-red-600'      },
          ].map(({ l, v, c }) => (
            <Card key={l}>
              <p className="text-xs text-slate-500 mb-1">{l}</p>
              <p className={`text-xl font-bold ${c}`}>{v}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search name or student number…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 w-64"
        />
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {[['all', 'All'], ['owing', 'With Arrears'], ['settled', 'Settled']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilterStatus(val)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                filterStatus === val ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Table
        columns={COLS}
        data={visible}
        loading={loading}
        emptyMessage={
          rows.length === 0
            ? 'No graduated or inactive students found.'
            : 'No students match the current filter.'
        }
        emptyIcon={faGraduationCap}
      />
    </div>
  );
}
