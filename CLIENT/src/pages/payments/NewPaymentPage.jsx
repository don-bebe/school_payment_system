// NewPaymentPage.jsx - Updated version

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft, faSearch, faReceipt, faGift,
  faCheckCircle, faCircle, faShirt,
  faTriangleExclamation, faUser, faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import { useAppDispatch, useAppSelector, useToast } from '../../hooks';
import { createPayment, fetchPaymentMethods, selectPaymentMethods, selectPaymentsLoading } from '../../store/slices/paymentsSlice';
import { fetchActiveYear, fetchActiveTerm, selectActiveYear, selectActiveTerm } from '../../store/slices/academicSlice';
import { formatCurrency } from '../../utils/formatters';
import { studentsApi, paymentsApi } from '../../api/services';
import { Card, CardHeader } from '../../components/ui/Card';
import { Input, FormField, Textarea } from '../../components/forms/FormControls';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

// ─── Item type constants ────────────────────────────────────────────────────────
const ITEM = {
  ADMISSION:    'AdmissionFee',
  REGISTRATION: 'RegistrationFee',
  SPORTS:       'SportsLevy',
  TUITION:      'Tuition',
  REPORT_BOOK:  'ReportBook',
  CUSTOM:       'CustomFee',
  TRANSPORT:    'Transport',
  PROJECT:      'ProjectFee',
  TRIP:         'Trip',
  UNIFORM:      'Uniform',
  EXTENSION:    'ExtensionFee',
};

// All types in allocation priority order (mirrors server)
const PRIORITY_ORDER = [
  ITEM.ADMISSION, ITEM.SPORTS, ITEM.TUITION, ITEM.REPORT_BOOK,
  ITEM.CUSTOM, ITEM.PROJECT, ITEM.TRANSPORT, ITEM.TRIP,
  ITEM.UNIFORM, ITEM.REGISTRATION, ITEM.EXTENSION,
];

// Human-readable group labels for display
const GROUP_LABELS = {
  [ITEM.ADMISSION]:    'Admission',
  [ITEM.SPORTS]:       'Sports Levy',
  [ITEM.TUITION]:      'Tuition (select months to cover — cleared oldest-first)',
  [ITEM.REPORT_BOOK]:  'Report Book',
  [ITEM.CUSTOM]:       'Other Fees',
  [ITEM.PROJECT]:      'Project Fee',
  [ITEM.TRANSPORT]:    'Transport (choose the exact month to pay)',
  [ITEM.TRIP]:         'Trips',
  [ITEM.UNIFORM]:      'Uniform',
  [ITEM.REGISTRATION]: 'Registration',
  [ITEM.EXTENSION]:    'Extension Month Fees',
};

// Fee types where the user's selection is a strict exact match (not sequential)
const EXPLICIT_TYPES = new Set([ITEM.TRANSPORT, ITEM.TRIP, ITEM.UNIFORM, ITEM.EXTENSION]);

function itemKey(item) {
  if (item.itemType === ITEM.UNIFORM)                               return 'uniform';
  if (item.itemType === ITEM.TRANSPORT && item.termMonthId)         return `transport_${item.termMonthId}`;
  if (item.itemType === ITEM.TRIP      && item.referenceId)         return `trip_${item.referenceId}`;
  if (item.itemType === ITEM.CUSTOM    && item.referenceId)         return `custom_${item.referenceId}`;
  if (item.itemType === ITEM.TUITION   && item.termMonthId)         return `tuition_${item.termMonthId}`;
  if (item.itemType === ITEM.EXTENSION && item.referenceId)         return `extension_${item.referenceId}`;
  return item.itemType;
}

function computePreview(amountUsd, selectedKeys, items, uniformSelections, uniformItems, customAmounts = {}) {
  if (!amountUsd || amountUsd <= 0) return { lines: [], surplus: 0 };
  let remaining = amountUsd;
  const lines = [];

  for (const type of PRIORITY_ORDER) {
    const groupItems = items.filter(i => i.itemType === type && selectedKeys.has(itemKey(i)));
    for (const item of groupItems) {
      if (remaining <= 0) break;
      if (item.itemType === ITEM.UNIFORM) {
        for (const sel of uniformSelections) {
          if (remaining <= 0) break;
          const u = uniformItems?.find(u => u.uniformItemId === sel.uniformItemId);
          if (!u) continue;
          const due   = u.price * sel.quantity;
          const alloc = Math.min(remaining, due);
          remaining -= alloc;
          lines.push({ label: `${u.name} ×${sel.quantity}`, due, paid: alloc, full: alloc >= due - 0.001 });
        }
      } else {
        const key        = itemKey(item);
        const customVal  = customAmounts[key];
        const configAmt  = Number(item.amount) || 0;
        // If a custom amount was entered use it as the cap, otherwise use configured amount
        const cap        = (customVal !== undefined && customVal !== '' && parseFloat(customVal) > 0)
          ? Math.min(parseFloat(customVal), configAmt)
          : configAmt;
        const alloc = Math.min(remaining, cap);
        remaining  -= alloc;
        lines.push({ label: item.label, due: configAmt, paid: alloc, full: alloc >= cap - 0.001 });
      }
    }
  }

  return { lines, surplus: Math.max(0, remaining) };
}

function buildSelectedItems(selectedKeys, items, customAmounts = {}, transportMeta = {}) {
  const regular = items
    .filter(i => selectedKeys.has(itemKey(i)) && i.itemType !== ITEM.UNIFORM)
    .map(i => {
      const key = itemKey(i);
      const custom = customAmounts[key];
      const overrideAmt = (custom !== undefined && custom !== '' && parseFloat(custom) > 0)
        ? parseFloat(custom)
        : null;
      const configuredAmt = Number(i.amount) || 0;
      // Only send override if it differs meaningfully from the configured amount
      const override = (overrideAmt !== null && Math.abs(overrideAmt - configuredAmt) > 0.001)
        ? overrideAmt
        : null;

      // Transport-specific metadata (partial payment support)
      const meta = i.itemType === ITEM.TRANSPORT && i.termMonthId
        ? (transportMeta[i.termMonthId] ?? {})
        : {};

      return {
        itemType:          i.itemType,
        referenceId:       i.referenceId    ?? null,
        termMonthId:       i.termMonthId    ?? null,
        overrideAmount:    override,
        totalSchoolDays:   meta.totalSchoolDays   ? Number(meta.totalSchoolDays)   : null,
        transportStartDate: meta.transportStartDate ?? null,
      };
    });

  // Uniform is handled via uniformSelections but the server still needs to see
  // PaymentItemType.Uniform in selectedItems to know it should process them.
  if (selectedKeys.has('uniform')) {
    regular.push({ itemType: ITEM.UNIFORM, referenceId: null, termMonthId: null, overrideAmount: null });
  }

  return regular;
}

// Group items by type for display, preserving priority order
function groupItems(items) {
  const map = {};
  for (const item of items) {
    if (!map[item.itemType]) map[item.itemType] = [];
    map[item.itemType].push(item);
  }
  // Return in priority order, skipping empty groups
  return PRIORITY_ORDER
    .filter(type => map[type]?.length > 0)
    .map(type => ({ type, label: GROUP_LABELS[type] ?? type, items: map[type] }));
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function MethodPill({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all border ${
        active ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
               : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
      }`}>{label}</button>
  );
}

function CurrencyPill({ value, active, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition-all border ${
        active ? 'bg-slate-800 text-white border-slate-800'
               : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
      }`}>{value}</button>
  );
}

function FeeItemCard({ item, selected, onChange, currency, zigRate, customAmount, onCustomAmountChange, transportMeta, onTransportMetaChange }) {
  const isExplicit    = EXPLICIT_TYPES.has(item.itemType);
  const isTuition     = item.itemType === ITEM.TUITION;
  const isUniform     = item.itemType === ITEM.UNIFORM;
  const isTransport   = item.itemType === ITEM.TRANSPORT;
  const configuredAmt = Number(item.amount) || 0;
  const isPartial     = isTransport && customAmount && Math.abs(parseFloat(customAmount) - configuredAmt) > 0.001;

  const displayAmt = (usd) => {
    if (!usd || usd <= 0) return null;
    if (currency === 'ZIG' && zigRate)
      return `ZIG ${(usd * Number(zigRate.ratePerUsd)).toFixed(2)}`;
    return formatCurrency(usd);
  };

  // Estimated days for partial transport payment
  const estimatedDays = isTransport && isPartial && configuredAmt > 0
    ? Math.floor((parseFloat(customAmount) / configuredAmt) * (Number(transportMeta?.totalSchoolDays) || 20))
    : null;

  return (
    <div className={`w-full rounded-xl border-2 transition-all ${
      selected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'
    }`}>
      <button
        type="button"
        onClick={() => onChange(!selected)}
        className="w-full text-left p-3"
      >
        <div className="flex items-center gap-3">
          <FontAwesomeIcon
            icon={selected ? faCheckCircle : faCircle}
            className={selected ? 'text-blue-500' : 'text-slate-300'}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-slate-800">
              {item.label}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {configuredAmt > 0 && (
                <span className="text-xs text-slate-500">{displayAmt(configuredAmt)}</span>
              )}
              {isTuition && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                  sequential
                </span>
              )}
              {isExplicit && !isTransport && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">
                  exact month
                </span>
              )}
              {isTransport && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                  partial OK
                </span>
              )}
            </div>
          </div>
        </div>
      </button>

      {/* Partial amount input — shown when item is selected and has a known configured amount */}
      {selected && !isUniform && configuredAmt > 0 && (
        <div className="px-3 pb-3 pt-0">
          <div className="ml-7 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 flex-shrink-0">Paying:</span>
            <div className="relative w-40">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">USD</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={customAmount ?? configuredAmt.toFixed(2)}
                onChange={e => onCustomAmountChange(e.target.value)}
                onClick={e => e.stopPropagation()}
                className="w-full pl-9 pr-2 py-1.5 text-sm font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white"
              />
            </div>
            <span className="text-xs text-slate-400">of {formatCurrency(configuredAmt)}</span>
            {customAmount && Math.abs(parseFloat(customAmount) - configuredAmt) > 0.001 && (
              <>
                <span className="text-[10px] text-amber-600 font-semibold px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200">partial</span>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onCustomAmountChange(configuredAmt.toFixed(2)); }}
                  className="text-[10px] text-blue-500 hover:text-blue-700 underline">
                  Pay full
                </button>
              </>
            )}
          </div>
          {currency === 'ZIG' && zigRate && customAmount && parseFloat(customAmount) > 0 && (
            <p className="ml-7 mt-1 text-[10px] text-amber-600">
              ≈ ZIG {(parseFloat(customAmount) * Number(zigRate.ratePerUsd)).toFixed(2)}
            </p>
          )}

          {/* Transport-specific partial payment details */}
          {isTransport && isPartial && (
            <div className="ml-7 mt-3 space-y-2 p-2 bg-sky-50 border border-sky-200 rounded-lg">
              <p className="text-[10px] font-semibold text-sky-700 uppercase tracking-wide">
                Partial Transport — Day Calculation
              </p>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600 w-36 flex-shrink-0">School days in month:</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={transportMeta?.totalSchoolDays ?? ''}
                  onChange={e => onTransportMetaChange({ ...transportMeta, totalSchoolDays: e.target.value })}
                  onClick={e => e.stopPropagation()}
                  placeholder="e.g. 20"
                  className="w-20 text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sky-300"
                />
                {estimatedDays !== null && (
                  <span className="text-xs font-semibold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                    ≈ {estimatedDays} days entitled
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600 w-36 flex-shrink-0">Transport start date:</label>
                <input
                  type="date"
                  value={transportMeta?.transportStartDate ?? ''}
                  onChange={e => onTransportMetaChange({ ...transportMeta, transportStartDate: e.target.value })}
                  onClick={e => e.stopPropagation()}
                  className="text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sky-300"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Optional — fill in if the student starts mid-month. Stored for reference in reports.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UniformSubPanel({ uniformItems, uniformSelections, onChange, currency, zigRate }) {
  const updateQty = (id, qty) => {
    const next = uniformSelections.filter(s => s.uniformItemId !== id);
    if (qty > 0) next.push({ uniformItemId: id, quantity: qty });
    onChange(next);
  };

  const displayAmt = (usd) => {
    if (currency === 'ZIG' && zigRate)
      return `ZIG ${(usd * Number(zigRate.ratePerUsd)).toFixed(2)}`;
    return formatCurrency(usd);
  };
  return (
    <div className="mt-1 ml-6 space-y-2 border-l-2 border-blue-200 pl-3 pb-1">
      {!uniformItems?.length
        ? <p className="text-xs text-slate-400 italic">No uniform items configured.</p>
        : uniformItems.map(u => {
          const qty = uniformSelections.find(s => s.uniformItemId === u.uniformItemId)?.quantity ?? 0;
          return (
            <div key={u.uniformItemId} className="flex items-center gap-2">
              <FontAwesomeIcon icon={faShirt} className="text-slate-400 text-xs w-4 flex-shrink-0" />
              <span className="flex-1 text-sm text-slate-700 truncate">{u.name}</span>
              <span className="text-xs text-slate-500">{displayAmt(u.price)}</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => updateQty(u.uniformItemId, Math.max(0, qty - 1))}
                  className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-sm">−</button>
                <span className="w-5 text-center text-sm font-semibold">{qty}</span>
                <button type="button" onClick={() => updateQty(u.uniformItemId, qty + 1)}
                  className="w-6 h-6 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 font-bold flex items-center justify-center text-sm">+</button>
              </div>
            </div>
          );
        })}
    </div>
  );
}

function SplitPreview({ lines, currency, surplus, zigRate }) {
  if (!lines.length) return null;

  // surplus from computePreview is always in USD (amountUsd was passed in)
  // For display we show original currency equivalent too if ZIG
  const surplusDisplay = surplus > 0
    ? currency === 'ZIG' && zigRate
      ? `ZIG ${(surplus * Number(zigRate.ratePerUsd)).toFixed(2)} (≈ ${formatCurrency(surplus)} USD)`
      : formatCurrency(surplus)
    : null;

  return (
    <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        Allocation preview
      </div>
      {lines.map((l, i) => (
        <div key={i} className={`flex items-center justify-between px-3 py-2 text-sm border-t border-slate-100 ${l.full ? '' : 'bg-amber-50'}`}>
          <span className={l.full ? 'text-slate-700' : 'text-amber-700'}>{l.label}</span>
          <div className="flex items-center gap-2">
            {!l.full && <span className="text-xs text-amber-500">partial of {formatCurrency(l.due)}</span>}
            <span className={`font-semibold ${l.full ? 'text-emerald-600' : 'text-amber-600'}`}>
              {formatCurrency(l.paid)}
            </span>
          </div>
        </div>
      ))}
      {surplus > 0 && (
        <div className="flex items-center justify-between px-3 py-2 text-sm border-t-2 border-blue-200 bg-blue-50">
          <span className="text-blue-700 font-semibold">Surplus</span>
          <span className="font-bold text-blue-700">{surplusDisplay}</span>
        </div>
      )}
    </div>
  );
}

// ─── Surplus Modal ────────────────────────────────────────────────────────────
const SURPLUS_TARGETS = [
  { value: 'RegistrationFee', label: 'Registration Fee' },
  { value: 'ProjectFee',      label: 'Project Fee'      },
  { value: 'Transport',       label: 'Transport'        },
  { value: 'Trip',            label: 'Trip'             },
  { value: 'Uniform',         label: 'Uniform'          },
  { value: 'Tuition',         label: 'Fees (Tuition)'   },
];

function SurplusModal({ surplus, currency, zigRate, onConfirm, onClose }) {
  const [target,    setTarget]    = useState('Tuition');
  const [amount,    setAmount]    = useState(surplus.toFixed(2));
  const [reason,    setReason]    = useState('');
  const [transfers, setTransfers] = useState([]);

  const remaining = Math.max(0, surplus - transfers.reduce((s, t) => s + t.amount, 0));

  // Display surplus in original currency if ZIG
  const displaySurplus   = (usd) => {
    if (currency === 'ZIG' && zigRate) return `ZIG ${(usd * Number(zigRate.ratePerUsd)).toFixed(2)}`;
    return formatCurrency(usd);
  };

  const addTransfer = () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0 || amt > remaining + 0.001) return;
    const capped = Math.min(amt, remaining);
    setTransfers(prev => [...prev, { targetItemType: target, amount: capped, reason, targetReferenceId: null, targetTermMonthId: null }]);
    setAmount('');
    setReason('');
  };

  const removeTransfer = (i) => setTransfers(prev => prev.filter((_, idx) => idx !== i));

  return (
    <Modal isOpen onClose={onClose} title="Surplus Payment">
      <div className="space-y-4">
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
          <p className="text-sm text-blue-800">
            The amount paid is <strong>{displaySurplus(surplus)}</strong> (≈ {formatCurrency(surplus)} USD) more than required.
            Direct this surplus to a service, or leave it to credit the next tuition month automatically.
          </p>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl text-sm">
          <p className="font-semibold text-slate-700 mb-1">Remaining surplus: <span className="text-blue-700">{displaySurplus(remaining)}</span></p>
          {transfers.length > 0 && (
            <div className="space-y-1 mt-2">
              {transfers.map((t, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">{SURPLUS_TARGETS.find(s => s.value === t.targetItemType)?.label} — {displaySurplus(t.amount)}</span>
                  <button onClick={() => removeTransfer(i)} className="text-red-400 hover:text-red-600 text-xs ml-2">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {remaining > 0.001 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Transfer to">
                <select value={target} onChange={e => setTarget(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                  {SURPLUS_TARGETS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </FormField>
              <FormField label={`Amount USD (max ${formatCurrency(remaining)})`}>
                <Input type="number" step="0.01" min="0" max={remaining}
                  value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
              </FormField>
            </div>
            <FormField label="Reason (optional)">
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Optional note" />
            </FormField>
            <Button size="sm" variant="secondary" icon={faArrowRight} onClick={addTransfer}>
              Add Transfer
            </Button>
          </div>
        )}

        {remaining > 0.001 && (
          <p className="text-xs text-slate-400">
            Any undirected surplus ({displaySurplus(remaining)}) will credit the next unpaid tuition month.
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={faReceipt} onClick={() => onConfirm(transfers)}>
            Continue & Record
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Helper function to calculate total selected amount including uniforms ───
function calculateTotalSelected(selectedKeys, items, uniformSelections, uniformItems, customAmounts = {}) {
  let total = 0;
  
  // Add regular selected items
  for (const item of items) {
    if (selectedKeys.has(itemKey(item)) && item.itemType !== ITEM.UNIFORM) {
      const key = itemKey(item);
      const custom = customAmounts[key];
      if (custom !== undefined && custom !== '' && parseFloat(custom) > 0) {
        total += parseFloat(custom);
      } else {
        total += Number(item.amount) || 0;
      }
    }
  }
  
  // Add uniform selections if uniform is selected
  if (selectedKeys.has('uniform')) {
    for (const sel of uniformSelections) {
      const u = uniformItems?.find(u => u.uniformItemId === sel.uniformItemId);
      if (u) {
        total += u.price * sel.quantity;
      }
    }
  }
  
  return total;
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function NewPaymentPage() {
  const dispatch   = useAppDispatch();
  const navigate   = useNavigate();
  const toast      = useToast();
  const [params]   = useSearchParams();
  const methods    = useAppSelector(selectPaymentMethods);
  const saving     = useAppSelector(selectPaymentsLoading);
  const activeYear = useAppSelector(selectActiveYear);
  const activeTerm = useAppSelector(selectActiveTerm);

  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching,     setSearching]     = useState(false);
  const [student,       setStudent]       = useState(null);
  const [eligibleData,  setEligibleData]  = useState(null);
  const [loadingItems,  setLoadingItems]  = useState(false);
  const [methodId,      setMethodId]      = useState('');
  const [currency,      setCurrency]      = useState('USD');
  const [amount,        setAmount]        = useState('');
  const [reference,     setReference]     = useState('');
  const [notes,         setNotes]         = useState('');
  const [prepayDesc,    setPrepayDesc]    = useState('');
  const [selectedKeys,  setSelectedKeys]  = useState(new Set());
  const [uniformSels,   setUniformSels]   = useState([]);
  const [uniformOpen,   setUniformOpen]   = useState(false);
  const [zigRate,       setZigRate]       = useState(null);
  const [errors,        setErrors]        = useState({});
  const [showSurplus,   setShowSurplus]   = useState(false);
  // Per-item custom amounts — key is itemKey(item), value is string USD amount
  // When null/missing, the configured full amount is used
  const [customAmounts, setCustomAmounts] = useState({});
  // Transport-specific metadata per termMonthId: { totalSchoolDays, transportStartDate }
  const [transportMeta, setTransportMeta] = useState({});

  useEffect(() => {
    dispatch(fetchPaymentMethods());
    dispatch(fetchActiveYear());
    dispatch(fetchActiveTerm());
    paymentsApi.getZigRate().then(r => setZigRate(r?.data?.data ?? r?.data ?? null)).catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    if (methods.length && !methodId) {
      const cash = methods.find(m => m.code === 'CASH') ?? methods[0];
      if (cash) setMethodId(String(cash.id));
    }
  }, [methods, methodId]);

  useEffect(() => {
    const id = params.get('studentId');
    if (!id) return;
    studentsApi.getById(Number(id)).then(r => {
      const s = r?.data?.data ?? r?.data ?? r;
      if (s?.id) doSelectStudent(s);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const r = await studentsApi.search({ query: q.trim(), pageSize: 8 });
      const list = r?.data?.data?.items ?? r?.data?.data ?? r?.data ?? [];
      setSearchResults(Array.isArray(list) ? list : []);
    } catch { setSearchResults([]); }
    finally  { setSearching(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => handleSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery, handleSearch]);

  const doSelectStudent = (s) => {
    setStudent(s); setSearchQuery(''); setSearchResults([]);
    setSelectedKeys(new Set()); setUniformSels([]); setEligibleData(null); setAmount(''); setAutoFilled(false);
    setCustomAmounts({}); setTransportMeta({});
  };

  useEffect(() => {
    if (!student?.id || !activeTerm?.id || !activeYear?.id) return;
    let cancelled = false;
    setLoadingItems(true);
    paymentsApi.getEligibleItems({ studentId: student.id, termId: activeTerm.id, academicYearId: activeYear.id })
      .then(r => {
        if (cancelled) return;
        const data = r?.data?.data ?? r?.data ?? null;
        setEligibleData(data);
        // 🔄 UPDATED: Start with NOTHING selected - user must manually choose items
        setSelectedKeys(new Set());
      })
      .catch(() => { if (!cancelled) setEligibleData(null); })
      .finally(() => { if (!cancelled) setLoadingItems(false); });
    return () => { cancelled = true; };
  }, [student?.id, activeTerm?.id, activeYear?.id]);

  const selectedMethod = methods.find(m => m.id === Number(methodId));
  const isPrepayment   = selectedMethod?.code === 'PREPAYMENT';
  const requiresRef    = selectedMethod?.requiresReference;
  const amountNum      = parseFloat(amount) || 0;
  const amountUsd      = currency === 'ZIG' && zigRate ? amountNum / Number(zigRate.ratePerUsd) : amountNum;

  const { lines: previewLines, surplus } = eligibleData
    ? computePreview(amountUsd, selectedKeys, eligibleData.items, uniformSels, eligibleData.uniformItems, customAmounts)
    : { lines: [], surplus: 0 };

  const arrearsOwing   = eligibleData?.tuitionArrearsOwing ?? 0;
  const itemGroups     = groupItems(eligibleData?.items ?? []);
  const selectedCount  = selectedKeys.size;
  // 🔄 UPDATED: Calculate total including uniform items
  const totalSelected  = eligibleData
    ? calculateTotalSelected(selectedKeys, eligibleData.items, uniformSels, eligibleData.uniformItems, customAmounts)
    : 0;

  // Display total in the selected currency
  const fmtTotal = (usd) => {
    if (currency === 'ZIG' && zigRate)
      return `ZIG ${(usd * Number(zigRate.ratePerUsd)).toFixed(2)}`;
    return formatCurrency(usd);
  };

// Auto-fill the amount field when selections change (only fills if field is empty
// or was previously auto-filled — never overwrites a manual entry)
const [_autoFilled, setAutoFilled] = useState(false);

// Auto-fill the amount field to match total selected items
useEffect(() => {
  if (!eligibleData || isPrepayment) return;
  
  // Calculate current total from selections
  let currentTotal = 0;
  for (const item of eligibleData.items) {
    if (selectedKeys.has(itemKey(item)) && item.itemType !== ITEM.UNIFORM) {
      const key = itemKey(item);
      const custom = customAmounts[key];
      if (custom !== undefined && custom !== '' && parseFloat(custom) > 0) {
        currentTotal += parseFloat(custom);
      } else {
        currentTotal += Number(item.amount) || 0;
      }
    }
  }
  
  if (selectedKeys.has('uniform')) {
    for (const sel of uniformSels) {
      const u = eligibleData.uniformItems?.find(u => u.uniformItemId === sel.uniformItemId);
      if (u) {
        currentTotal += u.price * sel.quantity;
      }
    }
  }
  
  // Always update amount field to match total (user can still manually override)
  if (currentTotal > 0) {
    const fillValue = currency === 'ZIG' && zigRate
      ? (currentTotal * Number(zigRate.ratePerUsd)).toFixed(2)
      : currentTotal.toFixed(2);
    setAmount(fillValue);
  } else if (currentTotal === 0 && amount !== '') {
    setAmount('');
  }
  
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedKeys, uniformSels, customAmounts, currency, zigRate]);

  const toggleItem = (item) => {
    const key = itemKey(item);
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        if (key === 'uniform') { 
          setUniformOpen(false); 
          setUniformSels([]); 
        }
        // Clear any custom amount for this item
        setCustomAmounts(ca => { const n = { ...ca }; delete n[key]; return n; });
      } else {
        next.add(key);
        if (item.itemType === ITEM.UNIFORM) setUniformOpen(true);
      }
      return next;
    });
  };

  const selectAll = () => {
    const keys = (eligibleData?.items ?? []).map(itemKey);
    setSelectedKeys(new Set(keys));
    const hasUniform = (eligibleData?.items ?? []).some(i => i.itemType === ITEM.UNIFORM);
    if (hasUniform) setUniformOpen(true);
  };

  const clearAll = () => {
    setSelectedKeys(new Set());
    setUniformOpen(false);
    setUniformSels([]);
    setCustomAmounts({});
  };

  const doSubmit = async (surplusTransfers) => {
    const payload = {
      studentId:             student.id,
      termId:                activeTerm.id,
      academicYearId:        activeYear.id,
      paymentMethodId:       Number(methodId),
      amountPaid:            amountNum,
      currency,
      reference:             reference.trim() || null,
      prepaymentDescription: isPrepayment ? prepayDesc.trim() : null,
      notes:                 notes.trim() || null,
      selectedItems:         buildSelectedItems(selectedKeys, eligibleData?.items ?? [], customAmounts, transportMeta),
      uniformSelections:     uniformSels.filter(s => s.quantity > 0),
      surplusTransfers:      surplusTransfers.length ? surplusTransfers : null,
    };
    const res = await dispatch(createPayment(payload));
    if (createPayment.fulfilled.match(res)) {
      toast.success('Payment recorded!');
      navigate(`/payments/${res.payload.id}/receipt`);
    } else {
      toast.error(res.payload ?? 'Failed to record payment.');
    }
  };

  const handleSubmit = async () => {
    const errs = {};
    if (!student)                                errs.student = 'Please select a student.';
    if (!methodId)                               errs.method  = 'Please select a payment method.';
    if (!isPrepayment && amountNum <= 0)         errs.amount  = 'Amount must be greater than zero.';
    if (isPrepayment && !prepayDesc.trim())      errs.prepay  = 'Please describe what is being provided.';
    if (requiresRef && !reference.trim())        errs.ref     = `${selectedMethod.name} requires a reference.`;
    if (!isPrepayment && selectedCount === 0)    errs.items   = 'Please select at least one item to pay for.';
    if (Object.keys(errs).length) { setErrors(errs); toast.error(Object.values(errs)[0]); return; }
    setErrors({});

    if (surplus > 0.001 && !isPrepayment) {
      setShowSurplus(true);
      return;
    }

    await doSubmit([]);
  };

  const handleSurplusConfirm = async (transfers) => {
    setShowSurplus(false);
    await doSubmit(transfers);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-8">
      {showSurplus && (
        <SurplusModal
          surplus={surplus}
          currency={currency}
          zigRate={zigRate}
          onClose={() => setShowSurplus(false)}
          onConfirm={handleSurplusConfirm}
        />
      )}

      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Record Payment</h1>
          <p className="text-sm text-slate-500">{activeTerm ? `${activeTerm.name} · ${activeYear?.name}` : 'Loading…'}</p>
        </div>
      </div>

      {/* Step 1 — Student */}
      <Card>
        <CardHeader title="1 · Student" />
        {student ? (
          <>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0">
                  <FontAwesomeIcon icon={faUser} className="text-blue-600 text-xs" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-blue-900 text-sm truncate">{student.firstName} {student.surname}</p>
                  <p className="text-blue-600 text-xs">{student.studentNumber} · {eligibleData?.gradeName || student.gradeName || ''}</p>
                </div>
                {arrearsOwing > 0 && (
                  <div className="flex items-center gap-1 bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0">
                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-xs" />
                    Arrears {formatCurrency(arrearsOwing)}
                  </div>
                )}
              </div>
            </div>
            {arrearsOwing > 0 && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5 flex-shrink-0" />
                <span>
                  Student has <strong>{formatCurrency(arrearsOwing)}</strong> in tuition arrears.
                  You can still proceed with standalone payments.
                </span>
              </div>
            )}
            <button type="button" onClick={() => { setStudent(null); setEligibleData(null); setSelectedKeys(new Set()); }}
              className="mt-2 text-xs text-blue-500 hover:text-blue-700">
              Change student
            </button>
          </>
        ) : (
          <div className="relative">
            <div className="relative">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Type student name…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              />
              {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Searching…</span>}
            </div>
            {searchResults.length > 0 && (
              <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                {searchResults.map(s => (
                  <button key={s.id} type="button" onClick={() => doSelectStudent(s)}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-slate-100 last:border-0">
                    <p className="text-sm font-semibold text-slate-800">{s.firstName} {s.surname}</p>
                    <p className="text-xs text-slate-500">{s.studentNumber} · {s.gradeName}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {student && (<>
        {/* Step 2 — Method & Currency */}
        <Card>
          <CardHeader title="2 · Payment Method & Currency" />
          <div className="flex gap-2 mb-3">
            {methods.filter(m => m.code !== 'PREPAYMENT').map(m => (
              <MethodPill key={m.id} label={m.name} active={methodId === String(m.id)} onClick={() => setMethodId(String(m.id))} />
            ))}
            {methods.find(m => m.code === 'PREPAYMENT') && (
              <MethodPill label="Prepayment" active={isPrepayment}
                onClick={() => setMethodId(String(methods.find(m => m.code === 'PREPAYMENT').id))} />
            )}
          </div>
          <div className="flex gap-2">
            <CurrencyPill value="USD" active={currency === 'USD'} onClick={() => setCurrency('USD')} />
            <CurrencyPill value="ZIG" active={currency === 'ZIG'} onClick={() => setCurrency('ZIG')} />
          </div>
          {currency === 'ZIG' && (
            <div className={`mt-3 p-3 rounded-xl border text-sm ${zigRate ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {zigRate ? `Rate: ${Number(zigRate.ratePerUsd).toFixed(2)} ZiG = USD 1` : 'No ZiG rate configured.'}
            </div>
          )}
          {requiresRef && (
            <div className="mt-3">
              <FormField label={`${selectedMethod.name} Reference`} error={errors.ref} required>
                <Input value={reference} onChange={e => setReference(e.target.value)}
                  placeholder="Transaction reference" error={errors.ref} />
              </FormField>
            </div>
          )}
        </Card>

        {/* Step 3 — Fee items (fully manual selection) */}
        <Card>
          <CardHeader
            title="3 · What to Pay"
            subtitle="Tuition is cleared oldest-first. Transport & other optional fees are paid for the exact month you choose."
          />
          {loadingItems ? (
            <p className="text-sm text-slate-400 text-center py-6">Loading fee items…</p>
          ) : eligibleData && itemGroups.length > 0 ? (
            <div className="space-y-4">

              {/* Select all / clear all bar */}
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-slate-500">
                  {selectedCount > 0
                    ? `${selectedCount} item${selectedCount > 1 ? 's' : ''} selected · Total due: ${fmtTotal(totalSelected)}`
                    : 'No items selected'}
                </span>
                <div className="flex gap-3">
                  <button type="button" onClick={selectAll}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                    Select all
                  </button>
                  {selectedCount > 0 && (
                    <button type="button" onClick={clearAll}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors">
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {errors.items && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <FontAwesomeIcon icon={faTriangleExclamation} />
                  {errors.items}
                </p>
              )}

              {/* Fee groups */}
              {itemGroups.map(group => (
                <div key={group.type}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    {group.label}
                  </p>
                  <div className="space-y-2">
                    {group.items.map((item, i) => (
                      <div key={i}>
                        <FeeItemCard
                          item={item}
                          selected={selectedKeys.has(itemKey(item))}
                          onChange={() => toggleItem(item)}
                          currency={currency}
                          zigRate={zigRate}
                          customAmount={customAmounts[itemKey(item)]}
                          onCustomAmountChange={(val) => {
                            setCustomAmounts(ca => ({ ...ca, [itemKey(item)]: val }));
                            setAutoFilled(false);
                          }}
                          transportMeta={item.itemType === ITEM.TRANSPORT && item.termMonthId ? transportMeta[item.termMonthId] : undefined}
                          onTransportMetaChange={(meta) => {
                            if (item.itemType === ITEM.TRANSPORT && item.termMonthId)
                              setTransportMeta(tm => ({ ...tm, [item.termMonthId]: meta }));
                          }}
                        />
                        {item.itemType === ITEM.UNIFORM && selectedKeys.has('uniform') && uniformOpen && (
                          <UniformSubPanel
                            uniformItems={eligibleData.uniformItems}
                            uniformSelections={uniformSels}
                            onChange={(newSelections) => {
                              setUniformSels(newSelections);
                              // Force a re-render to update totalSelected
                              setSelectedKeys(prev => new Set(prev));
                            }}
                            currency={currency}
                            zigRate={zigRate}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : eligibleData && itemGroups.length === 0 ? (
            <p className="text-sm text-emerald-600 text-center py-6">
              ✓ All fees for this term are fully settled.
            </p>
          ) : (
            <p className="text-sm text-slate-400 text-center py-6">Waiting for active term…</p>
          )}
        </Card>

        {/* Step 4 — Amount */}
        <Card>
          <CardHeader title={isPrepayment ? '4 · Prepayment Description' : '4 · Amount'} />
          {isPrepayment ? (
            <>
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-start gap-2">
                <FontAwesomeIcon icon={faGift} className="mt-0.5 flex-shrink-0" />
                <p>Prepayments are only accepted for tuition. Describe the in-kind contribution.</p>
              </div>
              <FormField error={errors.prepay} required>
                <textarea value={prepayDesc} onChange={e => setPrepayDesc(e.target.value)} rows={3}
                  placeholder="e.g. 50 kg maize…"
                  className={`w-full text-sm border rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 ${errors.prepay ? 'border-red-300' : 'border-slate-200'}`} />
              </FormField>
              <div className="mt-3">
                <FormField label="Estimated Value (optional)">
                  <Input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                </FormField>
              </div>
            </>
          ) : (
            <>
              {selectedCount > 0 && totalSelected > 0 && (
                <div className="mb-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700">
                  Total for selected items: <span className="font-bold text-slate-900">{fmtTotal(totalSelected)}</span>
                  <span className="text-xs text-slate-400 ml-2">— you can pay in full or a partial amount</span>
                </div>
              )}
              <FormField error={errors.amount} required>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">{currency}</span>
                  <input type="number" step="0.01" min="0" value={amount}
                    onChange={e => { setAmount(e.target.value); setAutoFilled(false); }}
                    placeholder="0.00"
                    className={`w-full pl-14 pr-4 py-3 text-lg font-semibold border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 ${errors.amount ? 'border-red-300' : 'border-slate-200 focus:border-blue-400'}`}
                  />
                </div>
                {currency === 'ZIG' && zigRate && amountNum > 0 && (
                  <p className="mt-1 text-xs text-amber-700">≈ USD {amountUsd.toFixed(2)}</p>
                )}
              </FormField>
              <SplitPreview lines={previewLines} currency={currency} surplus={surplus} zigRate={zigRate} />
            </>
          )}

          <div className="mt-4">
            <FormField label="Notes (optional)">
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes…" rows={2} />
            </FormField>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
            <Button loading={saving} icon={faReceipt} onClick={handleSubmit}
              disabled={!student || (!isPrepayment && amountNum <= 0)}>
              {surplus > 0.001 ? 'Review Surplus & Record' : 'Record & Print Receipt'}
            </Button>
          </div>
        </Card>
      </>)}
    </div>
  );
}