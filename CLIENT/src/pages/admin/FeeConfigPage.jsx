import { useEffect, useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faIdCard, faBook, faDoorOpen, faBus, faFlask,
  faShirt, faPlaneUp, faCheck, faTrash, faPen, faPlus, faCalendarDays,
  faCalendarPlus, faToggleOn, faToggleOff,
} from '@fortawesome/free-solid-svg-icons';
import { useAppDispatch, useAppSelector, useToast } from '../../hooks';
import { fetchActiveYear, fetchTerms, selectActiveYear, selectTerms } from '../../store/slices/academicSlice';
import { feesApi, academicApi } from '../../api/services';
import { SectionHeader, Card, CardHeader } from '../../components/ui/Card';
import { Input, FormField, Select } from '../../components/forms/FormControls';
import Button from '../../components/ui/Button';
import { formatCurrency } from '../../utils/formatters';

const MONTH_OPTIONS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' },   { value: 4, label: 'April' },
  { value: 5, label: 'May' },     { value: 6, label: 'June' },
  { value: 7, label: 'July' },    { value: 8, label: 'August' },
  { value: 9, label: 'September' },{ value: 10, label: 'October' },
  { value: 11, label: 'November' },{ value: 12, label: 'December' },
];

// ─── Reusable single-amount setting card ──────────────────────────────────────
function AmountSettingCard({ icon, title, subtitle, yearId, getter, setter, fieldLabel = 'Amount (USD)', fieldKey = 'amount' }) {
  const toast = useToast();
  const [current, setCurrent] = useState(null);
  const [value,   setValue]   = useState('');
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(async () => {
    if (!yearId) return;
    try {
      const r = await getter(yearId);
      const data = r?.data?.data ?? r?.data ?? null;
      setCurrent(data);
      setValue(data ? String(data[fieldKey] ?? data.amount ?? data.monthlyAmount ?? '') : '');
    } catch { /* not configured yet */ }
  }, [yearId, getter, fieldKey]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) { toast.error('Enter a valid amount.'); return; }
    setSaving(true);
    try {
      const payload = { academicYearId: Number(yearId), [fieldKey]: num };
      await setter(payload);
      toast.success(`${title} saved.`);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message ?? `Failed to save ${title}.`);
    } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-2"><FontAwesomeIcon icon={icon} className="text-blue-500" />{title}</span>}
        subtitle={subtitle}
      />
      <div className="flex items-end gap-3 max-w-sm">
        <FormField label={fieldLabel} className="flex-1">
          <Input
            type="number" step="0.01" min="0"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="0.00"
          />
        </FormField>
        <Button onClick={handleSave} loading={saving} icon={faCheck} size="sm" className="mb-0.5">
          Save
        </Button>
      </div>
      {current && (
        <p className="text-xs text-emerald-600 mt-2">
          ✓ Currently: {formatCurrency(current[fieldKey] ?? current.amount ?? current.monthlyAmount ?? 0)}
        </p>
      )}
    </Card>
  );
}

// ─── Uniform items manager ─────────────────────────────────────────────────────
function UniformItemsCard() {
  const toast = useToast();
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState({ name: '', gender: 'Both', price: '' });
  const [editId,  setEditId]  = useState(null);
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await feesApi.getUniforms({ activeOnly: false });
      setItems(r?.data?.data ?? r?.data ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Enter item name.'); return; }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) { toast.error('Enter a valid price.'); return; }
    setSaving(true);
    try {
      if (editId) {
        await feesApi.updateUniform(editId, { ...form, price, isActive: true });
        toast.success('Uniform item updated.');
      } else {
        await feesApi.createUniform({ ...form, price });
        toast.success('Uniform item added.');
      }
      setForm({ name: '', gender: 'Both', price: '' });
      setEditId(null);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Failed to save item.');
    } finally { setSaving(false); }
  };

  const handleToggle = async (item) => {
    try {
      await feesApi.updateUniform(item.id, { name: item.name, gender: item.gender, price: item.price, isActive: !item.isActive });
      await load();
    } catch { toast.error('Failed to update item.'); }
  };

  const startEdit = (item) => {
    setEditId(item.id);
    setForm({ name: item.name, gender: item.gender, price: String(item.price) });
  };

  const GENDER_OPTIONS = [
    { value: 'Both',  label: 'Both'  },
    { value: 'Boys',  label: 'Boys'  },
    { value: 'Girls', label: 'Girls' },
  ];

  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-2"><FontAwesomeIcon icon={faShirt} className="text-blue-500" />Uniform Items</span>}
        subtitle="Gender-specific items shown during payment"
      />

      {/* Add / Edit form */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <FormField label="Item Name">
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Boys Shirt" />
        </FormField>
        <FormField label="Gender">
          <Select options={GENDER_OPTIONS} value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} />
        </FormField>
        <FormField label="Price (USD)">
          <Input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
        </FormField>
      </div>
      <div className="flex gap-2 mb-4">
        <Button size="sm" icon={editId ? faCheck : faPlus} loading={saving} onClick={handleSave}>
          {editId ? 'Update Item' : 'Add Item'}
        </Button>
        {editId && (
          <Button size="sm" variant="secondary" onClick={() => { setEditId(null); setForm({ name: '', gender: 'Both', price: '' }); }}>
            Cancel
          </Button>
        )}
      </div>

      {/* Items list */}
      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400 italic">No uniform items configured yet.</p>
      ) : (
        <div className="space-y-1">
          {items.map(item => (
            <div key={item.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${item.isActive ? 'border-slate-200' : 'border-slate-100 opacity-50'}`}>
              <FontAwesomeIcon icon={faShirt} className="text-slate-400 text-xs" />
              <span className="flex-1 text-sm font-medium text-slate-800">{item.name}</span>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{item.gender}</span>
              <span className="text-sm font-semibold text-slate-700 w-20 text-right">{formatCurrency(item.price)}</span>
              <button onClick={() => startEdit(item)} className="text-blue-400 hover:text-blue-600 text-xs">
                <FontAwesomeIcon icon={faPen} />
              </button>
              <button onClick={() => handleToggle(item)} className="text-slate-400 hover:text-slate-600 text-xs">
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Trips manager ─────────────────────────────────────────────────────────────

// Per-month tuition fees card
function TermFeesCard({ terms }) {
  const toast  = useToast();
  const [termId,      setTermId]      = useState('');
  const [termFees,    setTermFees]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue,   setEditValue]   = useState('');
  const [saving,      setSaving]      = useState(false);

  const termMonths = termFees.length > 0
    ? (termFees[0].monthFees ?? []).map(mf => ({ id: mf.termMonthId, name: mf.monthName }))
    : [];

  useEffect(() => {
    if (!termId && terms.length) setTermId(String(terms[0].id));
  }, [terms, termId]);

  const load = useCallback(async () => {
    if (!termId) return;
    setLoading(true);
    try {
      const r = await academicApi.getTermFees(termId);
      setTermFees(r?.data?.data ?? r?.data ?? []);
    } catch { setTermFees([]); } finally { setLoading(false); }
  }, [termId]);

  useEffect(() => { load(); }, [load]);

  const getEffectiveAmount = (termFee, monthId) => {
    const override = (termFee.monthFees ?? []).find(mf => mf.termMonthId === monthId);
    if (override) return override.overrideAmount;
    const monthCount = termMonths.length;
    if (!monthCount) return 0;
    return Math.round((termFee.tuitionAmount / monthCount) * 100) / 100;
  };

  const hasOverride = (termFee, monthId) =>
    (termFee.monthFees ?? []).some(mf => mf.termMonthId === monthId);

  const startEdit = (termFee, month) => {
    setEditingCell({ termFeeId: termFee.id, termMonthId: month.id });
    setEditValue(String(getEffectiveAmount(termFee, month.id)));
  };

  const cancelEdit = () => { setEditingCell(null); setEditValue(''); };

  const handleSave = async () => {
    const num = parseFloat(editValue);
    if (isNaN(num) || num < 0) { toast.error('Enter a valid amount.'); return; }
    setSaving(true);
    try {
      await academicApi.setMonthFee({
        termFeeId:      editingCell.termFeeId,
        termMonthId:    editingCell.termMonthId,
        overrideAmount: num,
      });
      toast.success('Month fee saved.');
      setEditingCell(null);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Failed to save.');
    } finally { setSaving(false); }
  };

  const handleReset = async (termFee, month) => {
    try {
      await academicApi.deleteMonthFee(termFee.id, month.id);
      toast.success('Reset to even split.');
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Failed to reset.');
    }
  };

  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-2"><FontAwesomeIcon icon={faCalendarDays} className="text-blue-500" />Tuition Fees — Monthly Breakdown</span>}
        subtitle="View or override the tuition amount charged per month per grade. Overridden months show in blue."
      />
      <div className="mb-4 w-48">
        <Select
          options={terms.map(t => ({ value: t.id, label: t.name }))}
          value={termId}
          onChange={e => setTermId(e.target.value)}
          placeholder="Select term"
        />
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : termFees.length === 0 ? (
        <p className="text-sm text-slate-400 italic">No term fees configured for this term.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="text-left py-2 pr-4 font-semibold text-slate-600 whitespace-nowrap">Grade</th>
                <th className="text-right py-2 pr-6 font-semibold text-slate-400 text-xs whitespace-nowrap">Term Total</th>
                {termMonths.map(m => (
                  <th key={m.id} className="text-center py-2 px-3 font-semibold text-slate-600 min-w-[120px] whitespace-nowrap">
                    {m.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {termFees.map(tf => (
                <tr key={tf.id} className="hover:bg-slate-50/60">
                  <td className="py-3 pr-4 font-medium text-slate-800 whitespace-nowrap">{tf.gradeName}</td>
                  <td className="py-3 pr-6 text-right text-slate-400 text-xs tabular-nums whitespace-nowrap">
                    ${tf.tuitionAmount.toFixed(2)}
                  </td>
                  {termMonths.map(m => {
                    const isEditing  = editingCell?.termFeeId === tf.id && editingCell?.termMonthId === m.id;
                    const overridden = hasOverride(tf, m.id);
                    const amount     = getEffectiveAmount(tf, m.id);

                    return (
                      <td key={m.id} className="py-2 px-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center gap-1 justify-center">
                            <input
                              type="number" step="0.01" min="0"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') cancelEdit(); }}
                              className="w-20 border border-blue-400 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                              autoFocus
                            />
                            <button onClick={handleSave} disabled={saving}
                              className="text-emerald-600 hover:text-emerald-800 text-xs font-bold px-1">
                              <FontAwesomeIcon icon={faCheck} />
                            </button>
                            <button onClick={cancelEdit}
                              className="text-slate-400 hover:text-slate-600 text-xs px-1">
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 group">
                            <span className={`tabular-nums font-semibold ${overridden ? 'text-blue-700' : 'text-slate-700'}`}>
                              ${amount.toFixed(2)}
                            </span>
                            {overridden && (
                              <span className="text-[10px] text-blue-400 font-bold" title="Custom override">✎</span>
                            )}
                            <button
                              onClick={() => startEdit(tf, m)}
                              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-blue-500 text-xs transition-opacity"
                              title="Edit amount">
                              <FontAwesomeIcon icon={faPen} />
                            </button>
                            {overridden && (
                              <button
                                onClick={() => handleReset(tf, m)}
                                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 text-xs transition-opacity"
                                title="Reset to even split">
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-400 mt-3 italic">
            Hover any cell to edit. <span className="text-blue-600 not-italic">Blue ✎</span> = overridden. Trash icon resets to even split.
          </p>
        </div>
      )}
    </Card>
  );
}

function TripsCard({ terms }) {
  const toast = useToast();
  const [trips,   setTrips]   = useState([]);
  const [termId,  setTermId]  = useState('');
  const [form,    setForm]    = useState({ name: '', amount: '' });
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    if (!termId && terms.length) setTermId(String(terms[0].id));
  }, [terms, termId]);

  const load = useCallback(async () => {
    if (!termId) return;
    try {
      const r = await feesApi.getTrips(termId, { activeOnly: false });
      setTrips(r?.data?.data ?? r?.data ?? []);
    } catch { setTrips([]); }
  }, [termId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Enter trip name.'); return; }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount.'); return; }
    setSaving(true);
    try {
      await feesApi.createTrip({ termId: Number(termId), name: form.name.trim(), amount });
      toast.success('Trip created.');
      setForm({ name: '', amount: '' });
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Failed to create trip.');
    } finally { setSaving(false); }
  };

  const handleToggle = async (trip) => {
    try {
      await feesApi.updateTrip(trip.id, { name: trip.name, amount: trip.amount, isActive: !trip.isActive });
      await load();
    } catch { toast.error('Failed to update trip.'); }
  };

  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-2"><FontAwesomeIcon icon={faPlaneUp} className="text-blue-500" />Trip Payments</span>}
        subtitle="Create trips students can pay for"
      />

      {/* Term selector */}
      <div className="mb-4 w-48">
        <Select
          options={terms.map(t => ({ value: t.id, label: t.name }))}
          value={termId}
          onChange={e => setTermId(e.target.value)}
          placeholder="Select term"
        />
      </div>

      {/* New trip form */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <FormField label="Trip Name">
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Science Museum" />
        </FormField>
        <FormField label="Amount (USD)">
          <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
        </FormField>
      </div>
      <Button size="sm" icon={faPlus} loading={saving} onClick={handleCreate} className="mb-4">
        Create Trip
      </Button>

      {/* Trips list */}
      {trips.length === 0 ? (
        <p className="text-sm text-slate-400 italic">No trips for this term.</p>
      ) : (
        <div className="space-y-1">
          {trips.map(trip => (
            <div key={trip.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${trip.isActive ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
              <FontAwesomeIcon icon={faPlaneUp} className="text-slate-400 text-xs" />
              <span className="flex-1 text-sm font-medium text-slate-800">{trip.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${trip.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {trip.isActive ? 'Open' : 'Closed'}
              </span>
              <span className="text-sm font-semibold text-slate-700 w-20 text-right">{formatCurrency(trip.amount)}</span>
              <button onClick={() => handleToggle(trip)}
                className={`text-xs ${trip.isActive ? 'text-amber-500 hover:text-amber-700' : 'text-emerald-500 hover:text-emerald-700'}`}>
                {trip.isActive ? 'Close' : 'Reopen'}
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Term Extension Months card ────────────────────────────────────────────────
function TermExtensionCard({ terms }) {
  const toast = useToast();
  const [termId,        setTermId]        = useState('');
  const [termMonths,    setTermMonths]    = useState([]);   // regular months of selected term
  const [extensions,    setExtensions]    = useState([]);
  const [grades,        setGrades]        = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [addingMonth,   setAddingMonth]   = useState(false);
  const [newMonth,      setNewMonth]      = useState('');
  const [editingFee,    setEditingFee]    = useState(null); // { extMonthId, gradeId, value }
  const [savingFee,     setSavingFee]     = useState(false);

  // Pre-select first term
  useEffect(() => {
    if (!termId && terms.length) setTermId(String(terms[0].id));
  }, [terms, termId]);

  // Load grades once
  useEffect(() => {
    academicApi.getGrades()
      .then(r => setGrades(r?.data?.data ?? r?.data ?? []))
      .catch(() => {});
  }, []);

  // Fetch the term's regular months directly from the API — don't rely on
  // Redux term objects which may not include the months array.
  useEffect(() => {
    if (!termId) { setTermMonths([]); return; }
    academicApi.getTermMonths(termId)
      .then(r => setTermMonths(r?.data?.data ?? r?.data ?? []))
      .catch(() => setTermMonths([]));
  }, [termId]);

  const load = useCallback(async () => {
    if (!termId) return;
    setLoading(true);
    try {
      const r = await academicApi.getExtensionMonths(termId);
      setExtensions(r?.data?.data ?? r?.data ?? []);
    } catch { setExtensions([]); } finally { setLoading(false); }
  }, [termId]);

  useEffect(() => { load(); }, [load]);

  // ── Add extension month ──────────────────────────────────────────────────
  const handleAddMonth = async () => {
    if (!newMonth) { toast.error('Select a month.'); return; }
    setAddingMonth(true);
    try {
      await academicApi.addExtensionMonth({ termId: Number(termId), monthNumber: Number(newMonth) });
      toast.success('Extension month added.');
      setNewMonth('');
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Failed to add month.');
    } finally { setAddingMonth(false); }
  };

  const handleRemoveMonth = async (em) => {
    try {
      await academicApi.removeExtensionMonth(em.id);
      toast.success(`${em.monthName} removed.`);
      await load();
    } catch (e) { toast.error(e?.response?.data?.message ?? 'Failed to remove.'); }
  };

  const handleToggleMonth = async (em) => {
    try {
      await academicApi.toggleExtensionMonth(em.id, !em.isActive);
      await load();
    } catch { toast.error('Failed to toggle.'); }
  };

  // ── Grade fee editing ────────────────────────────────────────────────────
  const startEditFee = (em, gradeId, currentAmount) =>
    setEditingFee({ extMonthId: em.id, gradeId, value: String(currentAmount ?? '') });

  const handleSaveFee = async () => {
    const num = parseFloat(editingFee.value);
    if (isNaN(num) || num < 0) { toast.error('Enter a valid amount.'); return; }
    setSavingFee(true);
    try {
      await academicApi.setExtensionFee({
        termExtensionMonthId: editingFee.extMonthId,
        gradeId:              editingFee.gradeId,
        amount:               num,
      });
      toast.success('Fee saved.');
      setEditingFee(null);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Failed to save fee.');
    } finally { setSavingFee(false); }
  };

  const handleRemoveFee = async (em, gradeId) => {
    try {
      await academicApi.removeExtensionFee(em.id, gradeId);
      toast.success('Grade removed from extension month.');
      await load();
    } catch (e) { toast.error(e?.response?.data?.message ?? 'Failed to remove.'); }
  };

  // Build available-months list: exclude regular term months AND already-added extensions
  const usedMonthNumbers = new Set([
    ...termMonths.map(m => m.monthNumber),
    ...extensions.map(em => em.monthNumber),
  ]);
  const availableMonths = MONTH_OPTIONS.filter(m => !usedMonthNumbers.has(m.value));

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <FontAwesomeIcon icon={faCalendarPlus} className="text-blue-500" />
            Term Extension Months
          </span>
        }
        subtitle="Extend a term by adding extra months and set per-grade fees. Only configured grades will see the fee on the payment screen."
      />

      {/* Term selector */}
      <div className="mb-5 w-48">
        <Select
          options={terms.map(t => ({ value: t.id, label: t.name }))}
          value={termId}
          onChange={e => { setTermId(e.target.value); setNewMonth(''); }}
          placeholder="Select term"
        />
      </div>

      {/* ── Add extension month panel ── */}
      <div className="rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-4 mb-5">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">
          Add an extension month to this term
        </p>
        {availableMonths.length === 0 ? (
          <p className="text-sm text-slate-400 italic">All available months are already added.</p>
        ) : (
          <div className="flex items-end gap-3">
            <FormField label="Month to add" className="flex-1 max-w-[200px]">
              <Select
                options={availableMonths.map(m => ({ value: m.value, label: m.label }))}
                value={newMonth}
                onChange={e => setNewMonth(e.target.value)}
                placeholder="Select month…"
              />
            </FormField>
            <Button
              size="sm" icon={faPlus} loading={addingMonth}
              onClick={handleAddMonth} className="mb-0.5"
              disabled={!newMonth}
            >
              Add Month
            </Button>
          </div>
        )}
      </div>

      {/* ── Extension months list ── */}
      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : extensions.length === 0 ? (
        <p className="text-sm text-slate-400 italic">No extension months added yet for this term.</p>
      ) : (
        <div className="space-y-4">
          {extensions.map(em => (
            <div
              key={em.id}
              className={`border rounded-xl p-4 ${em.isActive ? 'border-blue-200 bg-blue-50/20' : 'border-slate-200 bg-slate-50 opacity-70'}`}
            >
              {/* Month header */}
              <div className="flex items-center gap-3 mb-3">
                <FontAwesomeIcon icon={faCalendarPlus} className="text-blue-400" />
                <span className="font-semibold text-slate-800">{em.monthName}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${em.isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                  {em.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="text-xs text-slate-400 ml-1">
                  {em.fees.length === 0 ? 'No grades configured' : `${em.fees.length} grade${em.fees.length === 1 ? '' : 's'}`}
                </span>
                <div className="ml-auto flex items-center gap-3">
                  <button
                    onClick={() => handleToggleMonth(em)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                      em.isActive
                        ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                        : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                    }`}
                  >
                    <FontAwesomeIcon icon={em.isActive ? faToggleOn : faToggleOff} />
                    {em.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleRemoveMonth(em)}
                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                    title="Remove extension month"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                    Remove
                  </button>
                </div>
              </div>

              {/* Grade fees list */}
              <div className="space-y-1 mb-3">
                {em.fees.length === 0 ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                    <span className="text-amber-500 text-xs">⚠</span>
                    <p className="text-xs text-amber-700">
                      No grades configured yet — use the form below to add grades. Until at least one grade is added, no student will see this fee.
                    </p>
                  </div>
                ) : (
                  em.fees.map(ef => {
                    const isEditing = editingFee?.extMonthId === em.id && editingFee?.gradeId === ef.gradeId;
                    return (
                      <div key={ef.gradeId} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-slate-100 group">
                        <span className="flex-1 text-sm font-medium text-slate-700">{ef.gradeName}</span>
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number" step="0.01" min="0"
                              value={editingFee.value}
                              onChange={e => setEditingFee(f => ({ ...f, value: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveFee(); if (e.key === 'Escape') setEditingFee(null); }}
                              className="w-24 border border-blue-400 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                              autoFocus
                            />
                            <button onClick={handleSaveFee} disabled={savingFee} className="text-emerald-600 hover:text-emerald-800 text-xs font-bold px-1" title="Save">
                              <FontAwesomeIcon icon={faCheck} />
                            </button>
                            <button onClick={() => setEditingFee(null)} className="text-slate-400 hover:text-slate-600 text-xs px-1" title="Cancel">✕</button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm font-semibold text-slate-700 w-20 text-right tabular-nums">
                              {formatCurrency(ef.amount)}
                            </span>
                            <button
                              onClick={() => startEditFee(em, ef.gradeId, ef.amount)}
                              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-blue-500 text-xs transition-opacity"
                              title="Edit amount"
                            >
                              <FontAwesomeIcon icon={faPen} />
                            </button>
                            <button
                              onClick={() => handleRemoveFee(em, ef.gradeId)}
                              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 text-xs transition-opacity"
                              title="Remove grade"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add grade fee row */}
              <AddGradeFeeRow em={em} grades={grades} onSaved={load} />
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400 mt-4 italic">
        Hover a grade row to edit its amount or remove it. Inactive extension months are hidden from the payment screen entirely.
      </p>
    </Card>
  );
}

function AddGradeFeeRow({ em, grades, onSaved }) {
  const toast = useToast();
  const [gradeId, setGradeId] = useState('');
  const [amount,  setAmount]  = useState('');
  const [saving,  setSaving]  = useState(false);

  const configuredGradeIds = new Set(em.fees.map(ef => ef.gradeId));
  const availableGrades    = grades.filter(g => !configuredGradeIds.has(g.id));

  const handleAdd = async () => {
    if (!gradeId) { toast.error('Select a grade.'); return; }
    const num = parseFloat(amount);
    if (isNaN(num) || num < 0) { toast.error('Enter a valid amount.'); return; }
    setSaving(true);
    try {
      await academicApi.setExtensionFee({
        termExtensionMonthId: em.id,
        gradeId:              Number(gradeId),
        amount:               num,
      });
      toast.success('Grade added.');
      setGradeId(''); setAmount('');
      onSaved();
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Failed to add.');
    } finally { setSaving(false); }
  };

  if (availableGrades.length === 0) return (
    <p className="text-xs text-slate-400 italic pt-2 border-t border-slate-100">All grades have been configured for this month.</p>
  );

  return (
    <div className="flex items-end gap-2 pt-3 border-t border-slate-100">
      <FormField label="Add grade" className="flex-1">
        <Select
          options={availableGrades.map(g => ({ value: g.id, label: g.name }))}
          value={gradeId}
          onChange={e => setGradeId(e.target.value)}
          placeholder="Select grade…"
        />
      </FormField>
      <FormField label="Fee amount (USD)" className="w-36">
        <Input
          type="number" step="0.01" min="0"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="0.00"
        />
      </FormField>
      <Button size="sm" icon={faPlus} loading={saving} onClick={handleAdd} className="mb-0.5">
        Add Grade
      </Button>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function FeeConfigPage() {
  const dispatch   = useAppDispatch();
  const activeYear = useAppSelector(selectActiveYear);
  const terms      = useAppSelector(selectTerms);

  useEffect(() => {
    dispatch(fetchActiveYear());
  }, [dispatch]);

  useEffect(() => {
    if (activeYear?.id) dispatch(fetchTerms(activeYear.id));
  }, [dispatch, activeYear?.id]);

  const yearId = activeYear?.id;

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-8">
      <SectionHeader
        title="Standalone Fee Configuration"
        subtitle={activeYear ? `Configuring for ${activeYear.name}` : 'Loading active year…'}
      />

      {!yearId && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          No active academic year found. Set an active year in the Academic Setup page first.
        </div>
      )}

      {yearId && (
        <div className="space-y-4">
          <AmountSettingCard
            icon={faIdCard} title="Registration Fee"
            subtitle="Grade 6 (once/year) and Grade 7 (Terms 1 & 2 only)"
            yearId={yearId} getter={feesApi.getRegistration} setter={feesApi.setRegistration}
          />
          <AmountSettingCard
            icon={faBook} title="Report Book Fee"
            subtitle="Compulsory for new enrolments; students can buy replacements"
            yearId={yearId} getter={feesApi.getReportBook} setter={feesApi.setReportBook}
          />
          <AmountSettingCard
            icon={faDoorOpen} title="Admission Fee"
            subtitle="One-time fee for students enrolling within the active term"
            yearId={yearId} getter={feesApi.getAdmission} setter={feesApi.setAdmission}
          />
          <AmountSettingCard
            icon={faBus} title="Transport Fee"
            subtitle="Optional monthly fee — shown per month on payment screen"
            yearId={yearId} getter={feesApi.getTransport} setter={feesApi.setTransport}
            fieldLabel="Monthly Amount (USD)" fieldKey="monthlyAmount"
          />
          <AmountSettingCard
            icon={faFlask} title="Project Fee"
            subtitle="Grade 6 &amp; 7 — students may start paying in Grade 6 and complete in Grade 7"
            yearId={yearId} getter={feesApi.getProject} setter={feesApi.setProject}
          />
          <UniformItemsCard />
          <TripsCard terms={terms} />
          <TermFeesCard terms={terms} />
          <TermExtensionCard terms={terms} />
        </div>
      )}
    </div>
  );
}