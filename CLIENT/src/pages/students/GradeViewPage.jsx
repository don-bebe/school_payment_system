import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { faArrowUp, faPrint } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAppDispatch, useAppSelector, useToast, usePermission } from '../../hooks';
import { fetchGradeView, selectGradeView, selectStudentsLoading, promoteStudents } from '../../store/slices/studentsSlice';
import {
  fetchGrades, fetchTerms, fetchActiveTerm, fetchActiveYear, fetchYears,
  selectGrades, selectTerms, selectActiveTerm, selectActiveYear, selectYears,
} from '../../store/slices/academicSlice';
import { SectionHeader } from '../../components/ui/Card';
import { FilterBar } from '../../components/ui/SearchBar';
import { Spinner } from '../../components/feedback/Loading';
import Modal, { ConfirmModal } from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { ROUTES } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatters';
import { paymentsApi } from '../../api/services';
import { faMoneyBillWave, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const STATUS_BG = {
  Paid:    'bg-emerald-500 text-white',
  Partial: 'bg-amber-400  text-white',
  Unpaid:  'bg-red-100    text-red-700',
  'N/A':   'bg-slate-100  text-slate-400',
};

function MonthCell({ month }) {
  if (!month) return <td className="px-2 py-3 text-center text-slate-300 text-xs">—</td>;
  const isNA = month.status === 'N/A';
  return (
    <td className="px-2 py-2 text-center align-top min-w-[90px]">
      <div className="flex items-center justify-center gap-1">
        <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold mb-1 ${STATUS_BG[month.status] ?? 'bg-slate-100 text-slate-500'}`}>
          {month.status}
        </span>
        {month.hasOverride && (
          <span title="Custom fee override applied for this month" className="inline-block mb-1 text-purple-500 text-[10px] font-bold leading-none cursor-help">✦</span>
        )}
      </div>
      {!isNA && (
        <div className="text-[10px] leading-tight space-y-0.5">
          <div className="text-emerald-600 font-medium">Paid: {formatCurrency(month.amountPaid ?? 0)}</div>
          {(month.balance ?? 0) > 0.001 && (
            <div className="text-red-500 font-medium">Bal: {formatCurrency(month.balance)}</div>
          )}
          <div className={`${month.hasOverride ? 'text-purple-500 font-semibold' : 'text-slate-400'}`}>
            Due: {formatCurrency(month.amountDue ?? 0)}
            {month.hasOverride && ' ✦'}
          </div>
        </div>
      )}
    </td>
  );
}

function ExtensionCell({ cell }) {
  if (!cell || cell.status === 'N/A') {
    return (
      <td className="px-2 py-2 text-center align-top min-w-[90px] bg-blue-50/20 border-l border-blue-100">
        <span className="text-xs text-slate-300">—</span>
      </td>
    );
  }
  return (
    <td className="px-2 py-2 text-center align-top min-w-[90px] bg-blue-50/20 border-l border-blue-100">
      <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold mb-1 ${STATUS_BG[cell.status] ?? 'bg-slate-100 text-slate-500'}`}>
        {cell.status}
      </span>
      <div className="text-[10px] leading-tight space-y-0.5">
        <div className="text-emerald-600 font-medium">Paid: {formatCurrency(cell.amountPaid ?? 0)}</div>
        {(cell.balance ?? 0) > 0.001 && (
          <div className="text-red-500 font-medium">Bal: {formatCurrency(cell.balance)}</div>
        )}
        <div className="text-slate-400">Due: {formatCurrency(cell.amountDue ?? 0)}</div>
      </div>
    </td>
  );
}

// ─── Build standalone HTML for the print window ───────────────────────────────

function buildPrintHtml({ rows, gradeName, termName, yearName }) {
  const months         = rows[0]?.months?.map(m => m.monthName) ?? [];
  const extensionCells = rows[0]?.extensionCells ?? [];

  const statusColor = (s) => ({
    Paid: '#d1fae5', Partial: '#fef3c7', 'N/A': '#f1f5f9',
  }[s] ?? '#fee2e2');

  const tableRows = rows.map(row => `
    <tr>
      <td>${row.fullName ?? '—'}</td>
      <td style="font-family:monospace">${row.studentNumber}</td>
      ${(row.months ?? []).map(m => `
        <td style="text-align:center;background:${statusColor(m.status)}">
          <div style="font-weight:600;font-size:10px">${m.status}</div>
          ${m.status !== 'N/A' ? `
            <div style="font-size:9px;color:#059669">Pd: $${Number(m.amountPaid ?? 0).toFixed(2)}</div>
            ${(m.balance ?? 0) > 0 ? `<div style="font-size:9px;color:#dc2626">Bal: $${Number(m.balance).toFixed(2)}</div>` : ''}
          ` : ''}
        </td>`).join('')}
      ${(row.extensionCells ?? []).map(ec => `
        <td style="text-align:center;background:${ec.status === 'N/A' ? '#f1f5f9' : statusColor(ec.status)};border-left:2px solid #bfdbfe">
          <div style="font-size:8px;color:#3b82f6;font-weight:600">EXT</div>
          <div style="font-weight:600;font-size:10px">${ec.status}</div>
          ${ec.status !== 'N/A' ? `
            <div style="font-size:9px;color:#059669">Pd: $${Number(ec.amountPaid ?? 0).toFixed(2)}</div>
            ${(ec.balance ?? 0) > 0 ? `<div style="font-size:9px;color:#dc2626">Bal: $${Number(ec.balance).toFixed(2)}</div>` : ''}
          ` : ''}
        </td>`).join('')}
      <td style="text-align:center;background:${
        (row.sportsDue ?? 0) === 0 ? '#f1f5f9' :
        (row.sportsBalance ?? 0) === 0 ? '#d1fae5' :
        (row.sportsPaid ?? 0) > 0 ? '#fef3c7' : '#fee2e2'
      }">
        ${(row.sportsDue ?? 0) === 0 ? '<span style="color:#94a3b8;font-size:9px">N/A</span>' : `
          <div style="font-weight:600;font-size:10px">${
            (row.sportsBalance ?? 0) === 0 ? 'Paid' :
            (row.sportsPaid ?? 0) > 0 ? 'Partial' : 'Unpaid'
          }</div>
          <div style="font-size:9px;color:#059669">Pd: $${Number(row.sportsPaid ?? 0).toFixed(2)}</div>
          ${(row.sportsBalance ?? 0) > 0 ? `<div style="font-size:9px;color:#dc2626">Bal: $${Number(row.sportsBalance).toFixed(2)}</div>` : ''}
        `}
      </td>
      <td style="text-align:right;font-weight:700;color:${row.totalOwing > 0 ? '#dc2626' : '#059669'}">
        $${Number(row.totalOwing ?? 0).toFixed(2)}
      </td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${gradeName} — Payment Status</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; margin: 10mm; color: #1e293b; }
    h2   { font-size: 15px; margin: 0 0 2px; }
    p    { margin: 0 0 10px; color: #64748b; font-size: 10px; }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 4px 5px;
      vertical-align: top;
    }
    th {
      background: #f1f5f9;
      font-weight: 600;
      text-align: center;
      font-size: 10px;
    }
    th:first-child, td:first-child { text-align: left; }
    tr:nth-child(even) td { background-color: #f8fafc; }
    @page  { size: A4 landscape; margin: 10mm; }
    @media print { body { margin: 0; } }
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  </style>
</head>
<body>
  <h2>${gradeName} — Payment Status</h2>
  <p>${termName} &nbsp;·&nbsp; ${yearName} &nbsp;·&nbsp; ${rows.length} student${rows.length !== 1 ? 's' : ''}</p>
  <table>
    <thead>
      <tr>
        <th style="min-width:140px">Student</th>
        <th>Reg #</th>
        ${months.map(m => `<th>${m}</th>`).join('')}
        ${extensionCells.map(ec => `<th style="background:#eff6ff;border-left:2px solid #bfdbfe"><div style="font-size:8px;color:#3b82f6">EXT</div>${ec.monthName}</th>`).join('')}
        <th>⚽ Sports</th>
        <th>Balance</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
  <script>
    window.onload = function() {
      window.focus();
      window.print();
      setTimeout(function() { window.close(); }, 500);
    };
  </script>
</body>
</html>`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────


// ─── Pay Arrears Modal ────────────────────────────────────────────────────────
function PayArrearsModal({ student, activeTerm, activeYear, methods, onClose, onSuccess }) {
  const toast = useToast();
  const [amount,    setAmount]    = useState(student.arrearsAmount > 0 ? String(student.arrearsAmount.toFixed(2)) : '');
  const [methodId,  setMethodId]  = useState(methods[0]?.id ? String(methods[0].id) : '');
  const [reference, setReference] = useState('');
  const [notes,     setNotes]     = useState('');
  const [saving,    setSaving]    = useState(false);

  const handleSave = async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) { toast.error('Enter a valid amount.'); return; }
    if (!methodId) { toast.error('Select a payment method.'); return; }
    setSaving(true);
    try {
      await paymentsApi.payArrears({
        studentId:      student.studentId,
        currentTermId:  activeTerm.id,
        academicYearId: activeYear.id,
        paymentMethodId: Number(methodId),
        amountPaid:     num,
        currency:       'USD',
        reference:      reference || null,
        notes:          notes || `Arrears: ${student.arrearsSummary ?? ''}`,
      });
      toast.success('Arrears payment recorded.');
      onSuccess?.();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Failed to record payment.');
    } finally { setSaving(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title="Record Arrears Payment">
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm">
          <div className="font-semibold text-amber-800 mb-1">
            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
            {student.fullName}
          </div>
          <div className="text-amber-700">Outstanding arrears: <span className="font-bold">{formatCurrency(student.arrearsAmount)}</span></div>
          {student.arrearsSummary && (
            <div className="text-xs text-amber-600 mt-1">{student.arrearsSummary}</div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Amount (USD) <span className="text-red-500">*</span></label>
          <input
            type="number" step="0.01" min="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="0.00"
          />
          <p className="text-xs text-slate-400 mt-1">Can be partial — remaining arrears will stay on record.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method <span className="text-red-500">*</span></label>
          <select
            value={methodId}
            onChange={e => setMethodId(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">— Select —</option>
            {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Reference (optional)</label>
          <input
            type="text"
            value={reference}
            onChange={e => setReference(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Receipt / transfer ref"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
            placeholder="e.g. Paying Term 1 July balance"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {saving ? 'Saving…' : <><FontAwesomeIcon icon={faMoneyBillWave} /> Record Payment</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function GradeViewPage() {
  const dispatch   = useAppDispatch();
  const navigate   = useNavigate();
  const toast      = useToast();
  const isAdmin    = usePermission(['Admin']);
  const rows       = useAppSelector(selectGradeView);
  const loading    = useAppSelector(selectStudentsLoading);
  const grades     = useAppSelector(selectGrades);
  const terms      = useAppSelector(selectTerms);
  const activeTerm = useAppSelector(selectActiveTerm);
  const activeYear = useAppSelector(selectActiveYear);
  const years      = useAppSelector(selectYears);

  const [filters,     setFilters]     = useState({ gradeId: '', termId: '' });
  const [termManuallySet, setTermManuallySet] = useState(false);
  const [promoting,   setPromoting]   = useState(false);
  const [showPromote, setShowPromote] = useState(false);
  const [toYearId,    setToYearId]    = useState('');
  const [selectedIds,   setSelectedIds]   = useState(new Set());
  const [arrearsStudent, setArrearsStudent] = useState(null);
  const [payMethods,     setPayMethods]     = useState([]);

  useEffect(() => {
    dispatch(fetchGrades());
    dispatch(fetchActiveYear());
    dispatch(fetchActiveTerm());
    dispatch(fetchYears());
    paymentsApi.getMethods().then(r => setPayMethods(r?.data?.data ?? [])).catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    if (activeYear) dispatch(fetchTerms(activeYear.id));
  }, [dispatch, activeYear]);

  // When active term changes (e.g. set from Academic page), reset the term
  // filter to follow it — unless the user has explicitly picked a different term.
  useEffect(() => {
    if (!activeTerm) return;
    if (!termManuallySet) {
      setFilters(f => ({ ...f, termId: '' }));
    }
  }, [activeTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const gradeId = filters.gradeId || grades[0]?.id;
    const termId  = filters.termId  || activeTerm?.id;
    if (gradeId && termId && activeYear) {
      dispatch(fetchGradeView({ gradeId, termId, academicYearId: activeYear.id }));
    }
  }, [dispatch, filters, grades, activeTerm, activeYear]);

  // Reset selections when the grade view data changes (avoids setState-in-effect warning)
  useEffect(() => {
    setSelectedIds(new Set());
  }, [rows]);

  const handlePromote = async () => {
    if (!activeYear || !toYearId) {
      toast.error('Please select the destination academic year.');
      return;
    }
    if (Number(toYearId) === activeYear.id) {
      toast.error('Destination year must be different from the current year.');
      return;
    }
    setPromoting(true);
    const res = await dispatch(promoteStudents({
      fromAcademicYearId: activeYear.id,
      toAcademicYearId:   Number(toYearId),
    }));
    setPromoting(false);
    setShowPromote(false);
    setToYearId('');
    if (promoteStudents.fulfilled.match(res)) {
      toast.success('Students promoted to the next grade.');
    } else {
      toast.error(res.payload ?? 'Promotion failed. Please try again.');
    }
  };

  const toggleSelect = (studentId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(studentId) ? next.delete(studentId) : next.add(studentId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === rows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map(r => r.studentId)));
    }
  };

  const handlePrintSelected = async () => {
    const toPrint = rows.filter(r => selectedIds.has(r.studentId));
    if (!toPrint.length) { toast.error('Select at least one student to print.'); return; }

    const resolvedGradeId = filters.gradeId || grades[0]?.id;
    const resolvedTermId  = filters.termId  || activeTerm?.id;
    const gradeName = grades.find(g => g.id === Number(resolvedGradeId))?.name ?? 'Class';
    const termName  = terms.find(t => t.id  === Number(resolvedTermId))?.name  ?? '';
    const yearName  = activeYear?.name ?? '';

    const html = buildPrintHtml({ rows: toPrint, gradeName, termName, yearName });

    // Electron path — use IPC printHtml to avoid EBADF from blocked window.open
    if (typeof window !== 'undefined' && window.electronAPI?.printHtml) {
      try {
        await window.electronAPI.printHtml(html);
        toast.success('Sent to printer.');
      } catch (err) {
        toast.error('Print failed: ' + (err?.message ?? 'unknown error'));
      }
      return;
    }

    // Browser / Vite path
    const printWin = window.open('', '_blank', 'width=1100,height=750');
    if (!printWin) {
      toast.error('Pop-up blocked — please allow pop-ups for this site and try again.');
      return;
    }
    printWin.document.write(html);
    printWin.document.close();
  };

  const months         = rows[0]?.months?.map(m => m.monthName) ?? [];
  const extensionCells = rows[0]?.extensionCells ?? [];
  const allSelected = rows.length > 0 && selectedIds.size === rows.length;
  const totalOwingAll  = rows.reduce((s, r) => s + (r.totalOwing ?? 0), 0);
  const totalSportsBal = rows.reduce((s, r) => s + (r.sportsBalance ?? 0), 0);
  const totalArrearsAll = rows.reduce((s, r) => s + (r.arrearsAmount ?? 0), 0);

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Grade View"
        subtitle="Monthly tuition + sports fee status by student"
        actions={
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <Button size="sm" variant="secondary" icon={faPrint} onClick={handlePrintSelected}>
                Print Selected ({selectedIds.size})
              </Button>
            )}
            {isAdmin && (
              <Button size="sm" variant="secondary" icon={faArrowUp} onClick={() => setShowPromote(true)}>
                Promote All Students
              </Button>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap gap-3 items-center">
        <FilterBar
          filters={[
            { key: 'gradeId', label: 'Select Grade', options: grades.map(g => ({ value: g.id, label: g.name })) },
            { key: 'termId',  label: 'Select Term',  options: terms.map(t => ({ value: t.id, label: t.name })) },
          ]}
          values={filters}
          onChange={(k, v) => {
            if (k === 'termId') setTermManuallySet(!!v);
            setFilters(f => ({ ...f, [k]: v }));
          }}
        />
        {/* Legend */}
        <div className="flex items-center gap-3 ml-auto text-xs flex-wrap">
          {[['Paid','bg-emerald-500'],['Partial','bg-amber-400'],['Unpaid','bg-red-100 border border-red-200'],['N/A','bg-slate-100 border border-slate-200']].map(([l,c]) => (
            <span key={l} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded ${c}`} />
              <span className="text-slate-500">{l}</span>
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="text-purple-500 font-bold text-sm leading-none">✦</span>
            <span className="text-slate-500">Override</span>
          </span>
        </div>
      </div>

      {/* Summary bar */}
      {rows.length > 0 && (
        <div className="flex flex-wrap gap-4 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
          <span className="text-slate-600">{rows.length} student{rows.length !== 1 ? 's' : ''}</span>
          <span className={`font-semibold ${totalOwingAll > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            Tuition balance: {formatCurrency(totalOwingAll)}
          </span>
          <span className={`font-semibold ${totalSportsBal > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            Sports balance: {formatCurrency(totalSportsBal)}
          </span>
          {totalArrearsAll > 0 && (
            <span className="font-semibold text-red-700">
              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1 text-xs" />
              Arrears: {formatCurrency(totalArrearsAll)}
            </span>
          )}
          {rows.length > 0 && (
            <span className="ml-auto text-xs text-slate-400">
              {selectedIds.size > 0
                ? `${selectedIds.size} of ${rows.length} selected`
                : 'Tick checkboxes to select students for printing'}
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-sm">
          Select a grade and term above to view payment status.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 w-8">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll}
                    className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 min-w-[160px] sticky left-0 bg-slate-50 z-10">Student</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-600 min-w-[80px]">No.</th>
                {months.map(m => (
                  <th key={m} className="px-2 py-3 text-center font-semibold text-slate-600 min-w-[90px]">{m}</th>
                ))}
                {extensionCells.map(ec => (
                  <th key={`ext-${ec.extensionMonthId}`} className="px-2 py-3 text-center font-semibold text-blue-600 min-w-[90px] bg-blue-50/40 border-l border-blue-100">
                    <div className="text-[9px] font-medium text-blue-400 uppercase tracking-wide leading-none mb-0.5">Ext.</div>
                    {ec.monthName}
                  </th>
                ))}
                <th className="px-2 py-3 text-center font-semibold text-slate-600 min-w-[90px] bg-amber-50 border-l border-amber-100">
                  ⚽ Sports
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600 min-w-[110px]">Balance</th>
                <th className="px-3 py-3 text-center font-semibold text-red-500 min-w-[110px] bg-red-50 border-l border-red-100">
                  Arrears
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {rows.map((row) => (
                <tr
                  key={row.studentId}
                  className={`hover:bg-blue-50/40 transition-colors ${selectedIds.has(row.studentId) ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <input type="checkbox"
                      checked={selectedIds.has(row.studentId)}
                      onChange={() => toggleSelect(row.studentId)}
                      className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800 sticky left-0 bg-inherit cursor-pointer"
                    onClick={() => navigate(ROUTES.STUDENT(row.studentId))}>
                    {row.fullName ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-slate-500 text-xs font-mono">{row.studentNumber}</td>

                  {row.months?.map((m) => (
                    <MonthCell key={m.monthName} month={m} />
                  ))}

                  {(row.extensionCells ?? []).map(ec => (
                    <ExtensionCell key={`ext-${ec.extensionMonthId}`} cell={ec} />
                  ))}

                  {/* Sports levy cell */}
                  <td className="px-2 py-2 text-center align-top bg-amber-50/30 border-l border-amber-100">
                    {(row.sportsDue ?? 0) === 0 ? (
                      <span className="text-xs text-slate-400">N/A</span>
                    ) : (
                      <>
                        <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold mb-1 ${
                          (row.sportsBalance ?? 0) === 0
                            ? 'bg-emerald-500 text-white'
                            : (row.sportsPaid ?? 0) > 0
                              ? 'bg-amber-400 text-white'
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {(row.sportsBalance ?? 0) === 0 ? 'Paid' : (row.sportsPaid ?? 0) > 0 ? 'Partial' : 'Unpaid'}
                        </span>
                        <div className="text-[10px] leading-tight space-y-0.5">
                          <div className="text-emerald-600 font-medium">Paid: {formatCurrency(row.sportsPaid ?? 0)}</div>
                          {(row.sportsBalance ?? 0) > 0 && (
                            <div className="text-red-500 font-medium">Bal: {formatCurrency(row.sportsBalance)}</div>
                          )}
                          <div className="text-slate-400">Due: {formatCurrency(row.sportsDue ?? 0)}</div>
                        </div>
                      </>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold text-sm ${row.totalOwing > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {formatCurrency(row.totalOwing, 'USD')}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center bg-red-50/40 border-l border-red-100">
                    {(row.arrearsAmount ?? 0) > 0 ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-semibold text-red-600">
                          {formatCurrency(row.arrearsAmount)}
                        </span>
                        {row.arrearsSummary && (
                          <span className="text-[10px] text-red-400 leading-tight text-center">
                            {row.arrearsSummary}
                          </span>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); setArrearsStudent(row); }}
                          className="mt-0.5 text-[10px] font-medium text-white bg-red-500 hover:bg-red-600 rounded px-2 py-0.5 transition-colors"
                        >
                          Pay
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Promote dialog — lets admin pick the destination academic year */}
      <Modal
        isOpen={showPromote}
        onClose={() => { setShowPromote(false); setToYearId(''); }}
        title="Promote All Students"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            This will advance every active student to the next grade for the selected academic year.
            Students in the highest grade (Grade 7) will be graduated and deactivated.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            <strong>Current year:</strong> {activeYear?.name ?? '—'}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Promote into which academic year? <span className="text-red-500">*</span>
            </label>
            <select
              value={toYearId}
              onChange={e => setToYearId(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">— Select destination year —</option>
              {years
                .filter(y => y.id !== activeYear?.id)
                .sort((a, b) => b.year - a.year)
                .map(y => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))
              }
            </select>
            {years.filter(y => y.id !== activeYear?.id).length === 0 && (
              <p className="mt-1 text-xs text-red-500">
                No other academic years found. Create the next year in Academic settings first.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowPromote(false); setToYearId(''); }}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePromote}
              disabled={!toYearId || promoting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {promoting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Promoting…
                </>
              ) : (
                'Promote All Students'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {arrearsStudent && (
        <PayArrearsModal
          student={arrearsStudent}
          activeTerm={activeTerm}
          activeYear={activeYear}
          methods={payMethods}
          onClose={() => setArrearsStudent(null)}
          onSuccess={() => {
            const gradeId = filters.gradeId || grades[0]?.id;
            const termId  = filters.termId  || activeTerm?.id;
            if (gradeId && termId && activeYear)
              dispatch(fetchGradeView({ gradeId, termId, academicYearId: activeYear.id }));
          }}
        />
      )}
    </div>
  );
}