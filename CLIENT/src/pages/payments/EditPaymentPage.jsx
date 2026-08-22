// EditPaymentPage.jsx
// Allows admins to correct the breakdown allocation of an existing payment
// (e.g. $15 was recorded as Project Fee but should have been Fees)
// The total amount on the payment is never changed — only the split.

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSave, faTriangleExclamation, faReceipt } from '@fortawesome/free-solid-svg-icons';
import { useAppDispatch, useAppSelector, useToast } from '../../hooks';
import {
  fetchPaymentById, editPayment,
  selectSelectedPayment, selectPaymentsLoading,
} from '../../store/slices/paymentsSlice';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Card, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/feedback/Loading';

// Helper — resolves breakdown array regardless of API casing
function getBreakdowns(payment) {
  return payment?.Breakdowns ?? payment?.breakdowns ?? payment?.breakdown ?? [];
}

// Helper — resolve amount fields from both camelCase and PascalCase API responses
function getAmountUsd(payment) {
  return payment?.AmountUsd ?? payment?.amountUsd ?? payment?.AmountPaid ?? payment?.amountPaid ?? 0;
}

export default function EditPaymentPage() {
  const { id }     = useParams();
  const dispatch   = useAppDispatch();
  const navigate   = useNavigate();
  const toast      = useToast();
  const payment    = useAppSelector(selectSelectedPayment);
  const loading    = useAppSelector(selectPaymentsLoading);

  const [lines,  setLines]  = useState([]);
  const [notes,  setNotes]  = useState('');
  const [errors, setErrors] = useState({});

  // Load the payment on mount
  useEffect(() => {
    dispatch(fetchPaymentById(Number(id)));
  }, [dispatch, id]);

  // Populate editable lines from the loaded payment
  useEffect(() => {
    if (!payment) return;
    const payId = payment.Id ?? payment.id;
    if (Number(payId) !== Number(id)) return;

    const bds = getBreakdowns(payment);
    if (!bds || bds.length === 0) return;

    setLines(
      bds.map(b => ({
        breakdownId: b.Id     ?? b.id,
        label:       b.Label  ?? b.label,
        amountDue:   b.AmountDue  ?? b.amountDue  ?? 0,
        amountPaid:  String(b.AmountPaid ?? b.amountPaid ?? 0),
        original:    b.AmountPaid ?? b.amountPaid ?? 0,
      }))
    );
  }, [payment, id]);

  const paymentStatus = payment?.Status ?? payment?.status;
  const paymentId     = payment?.Id     ?? payment?.id;

  if (loading && !payment) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!payment) return <p className="text-center text-slate-400 py-20">Payment not found.</p>;
  if (paymentStatus === 'Reversed') {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-400 text-4xl" />
        <p className="text-slate-600">This payment has been reversed and cannot be edited.</p>
        <Button variant="secondary" icon={faArrowLeft} onClick={() => navigate(-1)}>Back</Button>
      </div>
    );
  }

  const totalPaid  = getAmountUsd(payment);
  const currentSum = lines.reduce((s, l) => s + (parseFloat(l.amountPaid) || 0), 0);
  const isBalanced = Math.abs(currentSum - totalPaid) < 0.005;
  const hasChanges = lines.some(l => Math.abs((parseFloat(l.amountPaid) || 0) - l.original) > 0.001);

  const setLinePaid = (idx, val) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, amountPaid: val } : l));
    setErrors(e => ({ ...e, sum: null }));
  };

  const handleSave = async () => {
    const errs = {};
    if (!isBalanced) errs.sum = `Amounts must sum to ${formatCurrency(totalPaid)} (currently ${formatCurrency(currentSum)}).`;
    if (lines.some(l => parseFloat(l.amountPaid) < 0)) errs.negative = 'No amount can be negative.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (!hasChanges) { toast.info('No changes detected.'); return; }

    const res = await dispatch(editPayment({
      id:   Number(id),
      data: {
        breakdowns:      lines.map(l => ({ breakdownId: l.breakdownId, amountPaid: parseFloat(l.amountPaid) || 0 })),
        correctionNotes: notes.trim() || null,
      },
    }));

    if (editPayment.fulfilled.match(res)) {
      toast.success('Payment corrected successfully.');
      navigate(`/payments/${id}/receipt`);
    } else {
      toast.error(res.payload ?? 'Failed to save correction.');
    }
  };

  // Resolve display fields from both casing conventions
  const studentName       = payment.StudentName       ?? payment.studentName       ?? '—';
  const studentNumber     = payment.StudentNumber     ?? payment.studentNumber     ?? '—';
  const paymentDate       = payment.PaymentDate       ?? payment.paymentDate;
  const paymentMethodName = payment.PaymentMethodName ?? payment.paymentMethodName ?? '—';
  const termName          = payment.TermName          ?? payment.termName          ?? '—';
  const recordedByName    = payment.RecordedByName    ?? payment.recordedByName    ?? '—';
  const currency          = payment.Currency          ?? payment.currency          ?? 'USD';
  const zigRateUsed       = payment.ZigRateUsed       ?? payment.zigRateUsed;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Correct Payment</h1>
          <p className="text-sm text-slate-500">
            Adjust how the amount is split across fee types. Total must stay the same.
          </p>
        </div>
      </div>

      {/* Payment summary */}
      <Card>
        <CardHeader title="Payment Details" />
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-slate-400 text-xs">Student</p>
            <p className="font-semibold text-slate-800">{studentName}</p>
            <p className="text-slate-500 text-xs">{studentNumber}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Payment</p>
            <p className="font-semibold text-slate-800">{formatCurrency(totalPaid)} USD</p>
            {currency === 'ZIG' && zigRateUsed && (
              <p className="text-xs text-amber-600">
                Paid as ZIG at rate {zigRateUsed}
              </p>
            )}
          </div>
          <div>
            <p className="text-slate-400 text-xs">Date</p>
            <p className="text-slate-700">{paymentDate ? formatDate(paymentDate) : '—'}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Method</p>
            <p className="text-slate-700">{paymentMethodName}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Term</p>
            <p className="text-slate-700">{termName}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Recorded by</p>
            <p className="text-slate-700">{recordedByName}</p>
          </div>
        </div>
      </Card>

      {/* Editable breakdown */}
      <Card>
        <CardHeader
          title="Fee Breakdown"
          subtitle="Edit the amount paid for each fee line. The total must equal the original payment amount."
        />

        {lines.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-slate-400 text-sm">Loading breakdown…</p>
            <Spinner className="mt-3 mx-auto" />
          </div>
        ) : (
          <>
            {/* Running total indicator */}
            <div className={`mb-4 p-3 rounded-xl border text-sm flex items-center justify-between ${
              isBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                         : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <span className="font-medium">
                {isBalanced ? '✓ Amounts balanced' : '⚠ Amounts not balanced'}
              </span>
              <div className="text-right">
                <span className="font-bold">{formatCurrency(currentSum)}</span>
                <span className="text-xs ml-1">/ {formatCurrency(totalPaid)} required</span>
              </div>
            </div>

            {errors.sum && (
              <p className="text-xs text-red-500 mb-3 flex items-center gap-1">
                <FontAwesomeIcon icon={faTriangleExclamation} /> {errors.sum}
              </p>
            )}
            {errors.negative && (
              <p className="text-xs text-red-500 mb-3 flex items-center gap-1">
                <FontAwesomeIcon icon={faTriangleExclamation} /> {errors.negative}
              </p>
            )}

            <div className="space-y-3">
              {lines.map((line, idx) => {
                const paid    = parseFloat(line.amountPaid) || 0;
                const changed = Math.abs(paid - line.original) > 0.001;
                return (
                  <div key={line.breakdownId} className={`p-3 rounded-xl border transition-colors ${
                    changed ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'
                  }`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{line.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Due: {formatCurrency(line.amountDue)}
                          {changed && (
                            <span className="ml-2 text-blue-600 font-medium">
                              (was {formatCurrency(line.original)})
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="w-36 flex-shrink-0">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">USD</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.amountPaid}
                            onChange={e => setLinePaid(idx, e.target.value)}
                            className="w-full pl-10 pr-2 py-2.5 text-sm font-semibold text-right border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick balance helper */}
            {!isBalanced && lines.length > 0 && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs text-amber-700 font-medium mb-2">
                  Quick fix — assign remaining {formatCurrency(Math.abs(totalPaid - currentSum))} to:
                </p>
                <div className="flex flex-wrap gap-2">
                  {lines.map((l, idx) => (
                    <button key={idx} type="button"
                      onClick={() => {
                        const others = lines.filter((_, i) => i !== idx).reduce((s, l) => s + (parseFloat(l.amountPaid) || 0), 0);
                        setLinePaid(idx, Math.max(0, totalPaid - others).toFixed(2));
                      }}
                      className="text-xs px-2.5 py-1 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200 transition-colors">
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Correction notes */}
      <Card>
        <CardHeader title="Correction Notes" subtitle="Explain why this correction is being made (for audit log)." />
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="e.g. $15 was accidentally entered as Project Fee but should have been Tuition (May)."
          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </Card>

      {/* Actions */}
      <div className="flex justify-between items-center pt-1">
        <button onClick={() => navigate(`/payments/${id}/receipt`)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <FontAwesomeIcon icon={faReceipt} />
          View current receipt
        </button>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
          <Button
            icon={faSave}
            loading={loading}
            disabled={!isBalanced || !hasChanges || lines.length === 0}
            onClick={handleSave}
          >
            Save Correction
          </Button>
        </div>
      </div>
    </div>
  );
}

