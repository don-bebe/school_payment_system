import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft, faArrowRight, faSearch, faRightLeft,
  faCheckCircle, faTriangleExclamation, faRotateRight,
} from '@fortawesome/free-solid-svg-icons';
import { transfersApi, academicApi, studentsApi } from '../../api/services';
import { formatCurrency } from '../../utils/formatters';
import { Card, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/feedback/Loading';
import { Input, FormField, Select } from '../../components/forms/FormControls';
import { useToast } from '../../hooks';

// ─── Fee type labels ──────────────────────────────────────────────────────────
const FEE_LABELS = {
  Tuition:         'Fees (Tuition)',
  SportsLevy:      'Sports Levy',
  Transport:       'Transport',
  Trip:            'Trip',
  ProjectFee:      'Project Fee',
  RegistrationFee: 'Registration Fee',
  ReportBook:      'Report Book',
  AdmissionFee:    'Admission Fee',
  CustomFee:       'Custom Fee',
};

const TARGET_TYPES = [
  { value: 'Tuition',         label: 'Fees (Tuition)'    },
  { value: 'Transport',       label: 'Transport'          },
  { value: 'Trip',            label: 'Trip'               },
  { value: 'ProjectFee',      label: 'Project Fee'        },
  { value: 'RegistrationFee', label: 'Registration Fee'   },
  { value: 'ReportBook',      label: 'Report Book'        },
  { value: 'AdmissionFee',    label: 'Admission Fee'      },
  { value: 'SportsLevy',      label: 'Sports Levy'        },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function TransferCreditPage() {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const toast         = useToast();

  // Student search
  const [searchQ,     setSearchQ]     = useState('');
  const [searching,   setSearching]   = useState(false);
  const [results,     setResults]     = useState([]);
  const [student,     setStudent]     = useState(null);

  // Academic context
  const [years,       setYears]       = useState([]);
  const [terms,       setTerms]       = useState([]);
  const [termMonths,  setTermMonths]  = useState([]);   // months for the selected term
  const [yearId,      setYearId]      = useState('');
  const [termId,      setTermId]      = useState('');

  // Credits
  const [credits,     setCredits]     = useState([]);
  const [loadingCredits, setLoadingCredits] = useState(false);

  // Transfer form
  const [sourceCredit, setSourceCredit] = useState(null);
  const [targetType,   setTargetType]   = useState('Tuition');
  const [targetMonthId, setTargetMonthId] = useState('');
  const [targetRefId,  setTargetRefId]  = useState('');
  const [amount,       setAmount]       = useState('');
  const [reason,       setReason]       = useState('');
  const [submitting,   setSubmitting]   = useState(false);

  // Success
  const [done,         setDone]         = useState(null);

  // Load academic years on mount
  useEffect(() => {
    academicApi.getAll().then(r => {
      const ys = r.data?.data ?? [];
      setYears(ys);
      const active = ys.find(y => y.isActive) ?? ys[0];
      if (active) setYearId(String(active.id));
    }).catch(() => {});
  }, []);

  // Load terms when year changes
  useEffect(() => {
    if (!yearId) return;
    academicApi.getTermsByYear(Number(yearId)).then(r => {
      const ts = r.data?.data ?? [];
      setTerms(ts);
      const active = ts.find(t => t.isActive) ?? ts[0];
      if (active) setTermId(String(active.id));
    }).catch(() => {});
  }, [yearId]);

  // Load term months when term changes — used for transport target picker
  useEffect(() => {
    if (!termId) return;
    academicApi.getTermMonths(Number(termId))
      .then(r => setTermMonths(r.data?.data ?? r.data ?? []))
      .catch(() => setTermMonths([]));
  }, [termId]);

  // Search students
  const doSearch = useCallback(async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const r = await studentsApi.search({ q: searchQ.trim(), pageSize: 8 });
      setResults(r.data?.data?.items ?? []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, [searchQ]);

  // Pick student and load credits
  const selectStudent = async (s) => {
    setStudent(s);
    setResults([]);
    setSearchQ('');
    setSourceCredit(null);
    setCredits([]);
    if (yearId && termId) loadCredits(s.id, Number(yearId), Number(termId));
  };

  const loadCredits = async (sid, ayId, tId) => {
    setLoadingCredits(true);
    try {
      const r = await transfersApi.getTransferableCredits({ studentId: sid, academicYearId: ayId, termId: tId });
      setCredits(r.data?.data ?? []);
    } catch { setCredits([]); }
    finally { setLoadingCredits(false); }
  };

  useEffect(() => {
    if (student && yearId && termId) loadCredits(student.id, Number(yearId), Number(termId));
  }, [student, yearId, termId]);

  const selectSource = (c) => {
    setSourceCredit(c);
    setAmount(c.amountAvailable.toFixed(2));
    setTargetType(c.itemType === 'Tuition' ? 'Transport' : 'Tuition');
    setTargetMonthId('');
    setTargetRefId('');
  };

  const maxAmount = sourceCredit ? sourceCredit.amountAvailable : 0;
  const amountNum = parseFloat(amount) || 0;
  const amountValid = amountNum > 0 && amountNum <= maxAmount + 0.001;
  const sameType = sourceCredit?.itemType === targetType
    && sourceCredit?.termMonthId == (targetMonthId || null);

  const handleTransfer = async () => {
    if (!student || !sourceCredit || !amountValid || !reason.trim()) {
      toast.error('Please fill in all fields including a reason.');
      return;
    }
    if (sameType) { toast.error('Source and destination cannot be the same.'); return; }
    if (targetType === 'Transport' && !targetMonthId) {
      toast.error('Please select which month to credit transport for.'); return;
    }

    setSubmitting(true);
    try {
      const body = {
        studentId:         student.id,
        academicYearId:    Number(yearId),
        termId:            Number(termId),
        sourceItemType:    sourceCredit.itemType,
        sourceReferenceId: sourceCredit.referenceId ?? null,
        sourceTermMonthId: sourceCredit.termMonthId ?? null,
        sourcePaymentId:   sourceCredit.paymentId,
        targetItemType:    targetType,
        targetReferenceId: targetRefId ? Number(targetRefId) : null,
        targetTermMonthId: targetMonthId ? Number(targetMonthId) : null,
        amount:            amountNum,
        reason:            reason.trim(),
      };
      const r = await transfersApi.transfer(body);
      setDone(r.data?.data);
      toast.success('Credit transferred successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Transfer failed. Please check the details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Done state ─────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-5">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500 text-3xl" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Transfer Complete</h2>
        <div className="bg-slate-50 rounded-2xl p-4 text-sm text-left space-y-2 border border-slate-200">
          <p><span className="text-slate-400">Student:</span> <strong>{done.studentName}</strong></p>
          <p><span className="text-slate-400">From:</span> <strong>{done.sourceLabel}</strong></p>
          <p><span className="text-slate-400">To:</span> <strong>{done.targetLabel}</strong></p>
          <p><span className="text-slate-400">Amount:</span> <strong>{formatCurrency(done.amount)}</strong></p>
          <p><span className="text-slate-400">Transfer ID:</span> #{done.transferId}</p>
        </div>
        <div className="flex justify-center gap-3 pt-2">
          <Button variant="secondary" onClick={() => {
            setDone(null); setSourceCredit(null); setAmount(''); setReason('');
            loadCredits(student.id, Number(yearId), Number(termId));
          }}>
            Transfer Another
          </Button>
          <Button onClick={() => navigate('/reports/transfers')}>View Transfer Log</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FontAwesomeIcon icon={faRightLeft} className="text-blue-500" />
            Transfer Credit
          </h1>
          <p className="text-sm text-slate-500">
            Move a paid credit from one fee to another — e.g. transport payment → tuition.
          </p>
        </div>
      </div>

      {/* Student search */}
      <Card>
        <CardHeader title="Student" />
        {!student ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name or student number…"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSearch()}
                className="flex-1"
              />
              <Button icon={faSearch} onClick={doSearch} loading={searching} variant="secondary">Search</Button>
            </div>
            {results.length > 0 && (
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                {results.map(s => (
                  <button key={s.id} onClick={() => selectStudent(s)}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors">
                    <p className="text-sm font-semibold text-slate-800">{s.firstName} {s.surname}</p>
                    <p className="text-xs text-slate-400">{s.studentNumber} · {s.gradeName}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-800">{student.firstName} {student.surname}</p>
              <p className="text-xs text-slate-400">{student.studentNumber} · {student.gradeName}</p>
            </div>
            <button onClick={() => { setStudent(null); setCredits([]); setSourceCredit(null); }}
              className="text-xs text-blue-500 hover:text-blue-700 underline">Change</button>
          </div>
        )}
      </Card>

      {/* Academic context */}
      <Card>
        <CardHeader title="Academic Period" />
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Year">
            <Select value={yearId} onChange={e => setYearId(e.target.value)}>
              {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Term">
            <Select value={termId} onChange={e => setTermId(e.target.value)}>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </FormField>
        </div>
      </Card>

      {/* Source credit selector */}
      {student && (
        <Card>
          <CardHeader
            title="Step 1 — Select the Credit to Transfer"
            subtitle="Choose which paid amount you want to move to another service."
          />
          {loadingCredits ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : credits.length === 0 ? (
            <div className="text-center py-6 text-sm text-slate-400">
              <p>No transferable credits found for this student in the selected term.</p>
              <p className="text-xs mt-1">Credits appear here when a student has paid for a service with money available to reallocate.</p>
              <button onClick={() => loadCredits(student.id, Number(yearId), Number(termId))}
                className="mt-3 text-blue-500 hover:text-blue-700 flex items-center gap-1 mx-auto text-xs">
                <FontAwesomeIcon icon={faRotateRight} /> Refresh
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {credits.map((c, i) => {
                const sel = sourceCredit?.paymentId === c.paymentId
                         && sourceCredit?.itemType   === c.itemType
                         && sourceCredit?.termMonthId === c.termMonthId;
                return (
                  <button key={i} onClick={() => selectSource(c)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                      sel ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{c.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Receipt: {c.receiptNumber} · Paid: {formatCurrency(c.amountPaid)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-sm font-bold text-emerald-600">{formatCurrency(c.amountAvailable)}</p>
                        <p className="text-[10px] text-slate-400">available</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Transfer form */}
      {sourceCredit && (
        <Card>
          <CardHeader
            title="Step 2 — Where to Transfer"
            subtitle={`Moving credit from: ${sourceCredit.label} (up to ${formatCurrency(sourceCredit.amountAvailable)} available)`}
          />

          {/* Flow diagram */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4 text-sm">
            <div className="flex-1 text-center">
              <p className="text-xs text-slate-400 mb-1">FROM</p>
              <p className="font-semibold text-red-600 truncate">{sourceCredit.label}</p>
              <p className="text-xs text-slate-400">{formatCurrency(sourceCredit.amountAvailable)} available</p>
            </div>
            <FontAwesomeIcon icon={faArrowRight} className="text-blue-400 text-lg flex-shrink-0" />
            <div className="flex-1 text-center">
              <p className="text-xs text-slate-400 mb-1">TO</p>
              <p className="font-semibold text-emerald-600">
                {FEE_LABELS[targetType] ?? targetType}
                {targetType === 'Transport' && targetMonthId && termMonths.length > 0 && (
                  <span className="text-slate-500 font-normal">
                    {' — '}{termMonths.find(m => String(m.id) === String(targetMonthId))?.monthName ?? ''}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <FormField label="Transfer to" required>
              <Select value={targetType} onChange={e => {
                setTargetType(e.target.value);
                setTargetMonthId('');
                setTargetRefId('');
              }}>
                {TARGET_TYPES
                  .filter(t => !(t.value === sourceCredit.itemType && !sourceCredit.termMonthId))
                  .map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </FormField>

            {/* Transport target — show month dropdown using actual term months */}
            {targetType === 'Transport' && (
              <FormField label="Which month to credit transport for" required>
                <Select value={targetMonthId} onChange={e => setTargetMonthId(e.target.value)}>
                  <option value="">— Select month —</option>
                  {termMonths
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map(m => (
                      <option key={m.id} value={m.id}>{m.monthName}</option>
                    ))}
                </Select>
                <p className="text-xs text-slate-400 mt-1">
                  The transferred amount will be credited as a transport payment for this month.
                </p>
              </FormField>
            )}

            <FormField label={`Amount (USD) — max ${formatCurrency(maxAmount)}`} required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">USD</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={maxAmount}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="pl-12"
                  placeholder="0.00"
                />
              </div>
              {!amountValid && amount && (
                <p className="text-xs text-red-500 mt-1">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="mr-1" />
                  Must be between $0.01 and {formatCurrency(maxAmount)}.
                </p>
              )}
              {amountValid && Math.abs(amountNum - maxAmount) > 0.01 && (
                <button type="button" onClick={() => setAmount(maxAmount.toFixed(2))}
                  className="text-xs text-blue-500 hover:text-blue-700 mt-1 underline">
                  Transfer full {formatCurrency(maxAmount)}
                </button>
              )}
            </FormField>

            <FormField label="Reason (required for audit)" required>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={2}
                placeholder="e.g. Parent paid transport but child not using it — move to tuition."
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </FormField>

            {sameType && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <FontAwesomeIcon icon={faTriangleExclamation} />
                Source and destination are the same fee. Please select a different target.
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Actions */}
      {sourceCredit && (
        <div className="flex justify-between items-center">
          <button onClick={() => setSourceCredit(null)} className="text-sm text-slate-400 hover:text-slate-600">
            ← Back to credit selection
          </button>
          <Button
            icon={faRightLeft}
            loading={submitting}
            disabled={!amountValid || !reason.trim() || sameType || (targetType === 'Transport' && !targetMonthId)}
            onClick={handleTransfer}
          >
            Transfer {amountValid ? formatCurrency(amountNum) : ''}
          </Button>
        </div>
      )}
    </div>
  );
}