import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMoneyBillWave, faMagnifyingGlass, faSearch, faUser, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useApi } from '../../hooks';
import { studentsApi, paymentsApi } from '../../api/services';
import { SectionHeader, Card } from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Badge';
import { DateRangePicker } from '../../components/ui/SearchBar';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/feedback/Loading';
import { formatCurrency, formatDate } from '../../utils/formatters';

// ─── Smart Student Search ─────────────────────────────────────────────────────
function StudentSearch({ onSelect }) {
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDrop,  setShowDrop]  = useState(false);
  const [notFound,  setNotFound]  = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isStudentNumber = (v) => /^SCH-/i.test(v.trim());

  const runSearch = async (value) => {
    const q = value.trim();
    if (!q) return;
    setSearching(true);
    setNotFound(false);
    setShowDrop(false);
    try {
      if (isStudentNumber(q)) {
        const res = await studentsApi.getByNumber(q);
        const s   = res?.data?.data ?? res?.data ?? res;
        if (s?.id) {
          onSelect(s);
          setQuery('');
        } else {
          setNotFound(true);
        }
      } else {
        const res  = await studentsApi.search({ query: q, pageSize: 10 });
        const data = res?.data?.data ?? res?.data ?? res;
        const list = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
        if (list.length === 0) {
          setNotFound(true);
        } else if (list.length === 1) {
          onSelect(list[0]);
          setQuery('');
        } else {
          setResults(list);
          setShowDrop(true);
        }
      }
    } catch {
      setNotFound(true);
    } finally {
      setSearching(false);
    }
  };

  const choose = (s) => {
    setShowDrop(false);
    setResults([]);
    setQuery('');
    onSelect(s);
  };

  return (
    <div className="relative" ref={dropRef}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setNotFound(false); setShowDrop(false); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runSearch(query); } if (e.key === 'Escape') setShowDrop(false); }}
            placeholder="Type a name (e.g. Tendai) or student number (SCH-2026-00001)"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                       focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
          />
        </div>
        <Button size="sm" variant="secondary" icon={faMagnifyingGlass} loading={searching}
          onClick={() => runSearch(query)}>
          Find
        </Button>
      </div>

      {notFound && (
        <p className="text-xs text-red-500 mt-1.5 pl-1">
          No student found — try a different name or student number.
        </p>
      )}

      {showDrop && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200
                        rounded-xl shadow-lg overflow-hidden">
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {results.length} students found — select one
            </span>
            <button onClick={() => setShowDrop(false)} className="text-slate-400 hover:text-slate-600 p-0.5">
              <FontAwesomeIcon icon={faXmark} className="text-xs" />
            </button>
          </div>
          <ul className="max-h-60 overflow-y-auto divide-y divide-slate-50">
            {results.map(s => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => choose(s)}
                  className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors flex items-center gap-3"
                >
                  <span className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <FontAwesomeIcon icon={faUser} className="text-blue-500 text-xs" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-slate-800 truncate">
                      {s.firstName} {s.surname}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {s.studentNumber}{s.gradeName ? ` · ${s.gradeName}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PaymentsPage() {
  const navigate = useNavigate();

  const [student,  setStudent]  = useState(null);
  const [payments, setPayments] = useState([]);
  const [pLoading, setPLoading] = useState(false);

  const { execute: getPayments } = useApi(paymentsApi.getByStudent);

  // Receipt lookup by number
  const { execute: getReceiptByNum, loading: receiptLooking } = useApi(paymentsApi.getReceiptByNum);
  const [receiptNum, setReceiptNum] = useState('');

  // Date filter for the per-student list
  const [from, setFrom] = useState('');
  const [to,   setTo]   = useState('');

  const loadPayments = async (studentId, filters = {}) => {
    setPLoading(true);
    const list = await getPayments(studentId, filters).catch(() => []);
    // Unwrap envelope if needed
    const data = list?.data?.data ?? list?.data ?? list;
    setPayments(Array.isArray(data) ? data : []);
    setPLoading(false);
  };

  const handleStudentSelect = async (s) => {
    setStudent(s);
    setFrom('');
    setTo('');
    await loadPayments(s.id);
  };

  const clearStudent = () => {
    setStudent(null);
    setPayments([]);
    setFrom('');
    setTo('');
  };

  const applyDateFilter = () => {
    if (!student) return;
    loadPayments(student.id, { from: from || undefined, to: to || undefined });
  };

  const lookupReceipt = async () => {
    if (!receiptNum.trim()) return;
    const raw = await getReceiptByNum(receiptNum.trim()).catch(() => null);
    const receipt = raw?.data?.data ?? raw?.data ?? raw;
    if (receipt) {
      navigate(`/payments/${receipt.paymentId ?? receipt.id}/receipt`);
    }
  };

  const COLUMNS = [
    { key: 'paymentDate',       label: 'Date',    render: r => formatDate(r.paymentDate) },
    { key: 'termName',          label: 'Term'     },
    { key: 'paymentMethodName', label: 'Method'   },
    { key: 'currency',          label: 'CCY',     align: 'center' },
    { key: 'amountPaid',        label: 'Amount',  align: 'right',
      render: r => <span className="font-semibold text-slate-800">{formatCurrency(r.amountPaid, r.currency)}</span> },
    { key: 'status',            label: 'Status',  align: 'center',
      render: r => <StatusBadge status={r.status} /> },
    { key: 'receiptNumber',     label: 'Receipt', align: 'center',
      render: r => r.receiptNumber
        ? <span className="font-mono text-xs text-blue-600">{r.receiptNumber}</span>
        : '—' },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Payments"
        subtitle="Look up a student or find a receipt"
        actions={
          <Button size="sm" icon={faPlus} onClick={() => navigate('/payments/new')}>
            Record Payment
          </Button>
        }
      />

      {/* ── Two lookup panels ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Student lookup */}
        <Card padding="p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">Look Up Student</p>
          {student ? (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <span className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon icon={faUser} className="text-blue-600 text-xs" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-blue-900 text-sm truncate">{student.firstName} {student.surname}</p>
                <p className="text-blue-600 text-xs">{student.studentNumber}{student.gradeName ? ` · ${student.gradeName}` : ''}</p>
              </div>
              <button
                onClick={clearStudent}
                className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-400 hover:text-blue-600 transition-colors flex-shrink-0"
                title="Clear"
              >
                <FontAwesomeIcon icon={faXmark} className="text-xs" />
              </button>
            </div>
          ) : (
            <StudentSearch onSelect={handleStudentSelect} />
          )}
        </Card>

        {/* Receipt lookup */}
        <Card padding="p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">Find Receipt by Number</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={receiptNum}
              onChange={e => setReceiptNum(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && lookupReceipt()}
              placeholder="e.g. RCP-2026-00042"
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white
                         focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400
                         font-mono"
            />
            <Button size="sm" variant="secondary" icon={faSearch} loading={receiptLooking}
              onClick={lookupReceipt}>
              Go
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Navigates directly to the receipt print view.</p>
        </Card>
      </div>

      {/* ── Payment list for selected student ── */}
      {student && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
            <p className="text-sm font-medium text-slate-600">
              Payments for <span className="text-slate-900 font-semibold">{student.firstName} {student.surname}</span>
            </p>
            <div className="ml-auto flex items-center gap-2">
              <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
              <Button size="sm" variant="secondary" onClick={applyDateFilter}>Filter</Button>
            </div>
          </div>
          {pLoading ? (
            <div className="flex justify-center py-10"><Spinner size="lg" /></div>
          ) : (
            <Table
              columns={COLUMNS}
              data={payments}
              emptyMessage="No payments recorded for this student."
              emptyIcon={faMoneyBillWave}
              onRowClick={r => navigate(`/payments/${r.id}/receipt`)}
            />
          )}
        </div>
      )}

      {!student && (
        <div className="text-center py-16 text-slate-400 text-sm">
          <FontAwesomeIcon icon={faMoneyBillWave} className="text-4xl text-slate-200 mb-3 block" />
          Search by student name or number above to view their payment history.
        </div>
      )}
    </div>
  );
}
