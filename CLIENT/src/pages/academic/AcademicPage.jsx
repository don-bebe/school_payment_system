import { useEffect, useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faCheck, faPen,
  faMoneyBillWave, faLayerGroup,
  faIdCard, faBook, faDoorOpen, faBus, faFlask,
  faShirt, faPlaneUp, faTrash, faCalendarDays, faChevronDown, faChevronUp,
  faCalendarPlus, faToggleOn, faToggleOff,
} from '@fortawesome/free-solid-svg-icons';
import { useAppDispatch, useAppSelector, useToast } from '../../hooks';
import {
  fetchGrades, fetchYears, fetchActiveYear, fetchTerms, fetchActiveTerm, fetchTermFees,
  createGrade, createYear, createTerm, setTermFee, setActiveYear, setActiveTerm,
  selectGrades, selectYears, selectActiveYear, selectTerms, selectActiveTerm, selectTermFees,
} from '../../store/slices/academicSlice';
import { feesApi, academicApi } from '../../api/services';
import { SectionHeader, Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input, Select, FormField } from '../../components/forms/FormControls';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../hooks';

// ─── Tab definitions ──────────────────────────────────────────────────────────
// Fee Config tab only visible to Admin
const ALL_TABS    = ['Grades', 'Academic Years', 'Terms', 'Term Fees', 'Fee Config'];
const PUBLIC_TABS = ['Grades', 'Academic Years', 'Terms', 'Term Fees'];

// Pure helper — build initial row state from grades + any existing fees
function buildRows(grades, existingFees) {
  return grades.map(g => {
    const existing = existingFees.find(f => f.gradeId === g.id);
    return {
      gradeId:                 g.id,
      gradeName:               g.name,
      selected:                !!existing,
      tuitionAmount:           existing ? String(existing.tuitionAmount ?? existing.amount ?? '') : '',
      sportsLevyAmount:        existing ? String(existing.sportsLevyAmount ?? '0') : '0',
      staffChildTuition:       existing ? String(existing.staffChildTuitionAmount ?? '') : '',
      staffChildSportsLevy:    existing ? String(existing.staffChildSportsLevyAmount ?? '') : '',
      overrideAmount:          !!existing,
    };
  });
}

// ─── Multi-grade fee modal ─────────────────────────────────────────────────────
function TermFeeModal({ onClose, grades, activeTerm, existingFees, onSaved }) {
  const dispatch = useAppDispatch();
  const toast    = useToast();

  const [sharedAmount,     setSharedAmount]     = useState('');
  const [sharedSportsLevy, setSharedSportsLevy] = useState('0');
  const [feeRows,        setFeeRows]        = useState(() => buildRows(grades, existingFees));
  const [saving,         setSaving]         = useState(false);
  const [saveProgress,   setSaveProgress]   = useState({ done: 0, total: 0 });

  const handleSharedAmountChange = (val) => {
    setSharedAmount(val);
    setFeeRows(rows => rows.map(r => r.overrideAmount ? r : { ...r, tuitionAmount: val }));
  };

  const handleSharedSportsLevyChange = (val) => {
    setSharedSportsLevy(val);
    setFeeRows(rows => rows.map(r => ({ ...r, sportsLevyAmount: val })));
  };

  const toggleGrade = (gradeId) =>
    setFeeRows(rows => rows.map(r =>
      r.gradeId === gradeId ? { ...r, selected: !r.selected } : r
    ));

  const toggleAll = () => {
    const allSelected = feeRows.every(r => r.selected);
    setFeeRows(rows => rows.map(r => ({ ...r, selected: !allSelected })));
  };

  const setRowAmount = (gradeId, val) =>
    setFeeRows(rows => rows.map(r =>
      r.gradeId === gradeId ? { ...r, tuitionAmount: val, overrideAmount: true } : r
    ));

  const clearOverride = (gradeId) =>
    setFeeRows(rows => rows.map(r =>
      r.gradeId === gradeId
        ? { ...r, tuitionAmount: sharedAmount, overrideAmount: false }
        : r
    ));

  const selectedRows = feeRows.filter(r => r.selected);
  const allSelected  = feeRows.length > 0 && feeRows.every(r => r.selected);
  const someSelected = feeRows.some(r => r.selected);
  const canSave      = someSelected && selectedRows.every(r => Number(r.tuitionAmount) > 0);

  const progressPct = saveProgress.total > 0
    ? Math.round((saveProgress.done / saveProgress.total) * 100) : 0;

  const handleSave = async () => {
    if (!activeTerm?.id) { toast.error('No active term selected.'); return; }
    if (!canSave)        { toast.error('Enter a valid amount for every selected grade.'); return; }

    setSaving(true);
    setSaveProgress({ done: 0, total: selectedRows.length });

    let failed = 0;
    for (const row of selectedRows) {
      const res = await dispatch(setTermFee({
        termId:                     activeTerm.id,
        gradeId:                    row.gradeId,
        tuitionAmount:              Number(row.tuitionAmount) || 0,
        sportsLevyAmount:           Number(row.sportsLevyAmount) || 0,
        staffChildTuitionAmount:    row.staffChildTuition ? Number(row.staffChildTuition) : null,
        staffChildSportsLevyAmount: row.staffChildSportsLevy ? Number(row.staffChildSportsLevy) : null,
      }));
      if (setTermFee.fulfilled.match(res)) {
        setSaveProgress(p => ({ ...p, done: p.done + 1 }));
      } else {
        failed++;
      }
    }

    setSaving(false);
    if (failed === 0) {
      toast.success(`Saved fees for ${selectedRows.length} grade${selectedRows.length !== 1 ? 's' : ''}.`);
      onSaved?.();
      onClose();
    } else {
      toast.error(`${failed} grade${failed !== 1 ? 's' : ''} failed to save. Please try again.`);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Set Term Fees — ${activeTerm?.name ?? '…'}`}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full gap-3">
          <div className="flex-1">
            {saving && (
              <div>
                <p className="text-xs text-slate-500 mb-1">
                  Saving… {saveProgress.done}/{saveProgress.total}
                </p>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}
            {!saving && someSelected && (
              <p className="text-xs text-slate-500">
                {selectedRows.length} grade{selectedRows.length !== 1 ? 's' : ''} selected
                {canSave ? '' : ' — enter amounts to continue'}
              </p>
            )}
          </div>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={!canSave}
            icon={faMoneyBillWave}
          >
            Save {selectedRows.length > 0 ? `(${selectedRows.length})` : ''} Fees
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* ── Shared amount ─────────────────────────────────────────── */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <FontAwesomeIcon icon={faLayerGroup} />
            Shared Amount — applies to all selected grades
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-blue-600 font-medium block mb-1">Tuition (term total, USD)</label>
              <input
                type="number" step="0.01" min="0"
                value={sharedAmount}
                onChange={e => handleSharedAmountChange(e.target.value)}
                placeholder="e.g. 105.00"
                className="w-full text-sm border border-blue-200 rounded-lg px-3 py-2 bg-white
                           focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="text-xs text-blue-600 font-medium block mb-1">Sports Levy (first month)</label>
              <input
                type="number" step="0.01" min="0"
                value={sharedSportsLevy}
                onChange={e => handleSharedSportsLevyChange(e.target.value)}
                placeholder="e.g. 5.00"
                className="w-full text-sm border border-blue-200 rounded-lg px-3 py-2 bg-white
                           focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
              />
            </div>
          </div>
          <p className="text-xs text-blue-500 mt-2">
            Tuition is split evenly across term months. Sports levy is charged once in month 1.
            Tick grades below to apply, or override per-grade.
          </p>
        </div>

        {/* ── Staff child rates ─────────────────────────────────────── */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">
            Staff Child Rates — optional overrides
          </p>
          <p className="text-xs text-amber-600 mb-3">
            If blank, staff children pay the standard rate. Staff child status is set per student
            or automatically triggered when 3+ siblings from the same guardian are enrolled
            (highest-grade sibling gets the discount).
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-amber-600 font-medium block mb-1">Staff Child Tuition (term total)</label>
              <input
                type="number" step="0.01" min="0"
                value={feeRows[0]?.staffChildTuition ?? ''}
                onChange={e => setFeeRows(rows => rows.map(r => ({ ...r, staffChildTuition: e.target.value })))}
                placeholder="Leave blank for standard rate"
                className="w-full text-sm border border-amber-200 rounded-lg px-3 py-2 bg-white
                           focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
            </div>
            <div>
              <label className="text-xs text-amber-600 font-medium block mb-1">Staff Child Sports Levy</label>
              <input
                type="number" step="0.01" min="0"
                value={feeRows[0]?.staffChildSportsLevy ?? ''}
                onChange={e => setFeeRows(rows => rows.map(r => ({ ...r, staffChildSportsLevy: e.target.value })))}
                placeholder="Leave blank for standard rate"
                className="w-full text-sm border border-amber-200 rounded-lg px-3 py-2 bg-white
                           focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
            </div>
          </div>
        </div>

        {/* ── Grade rows ────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                {allSelected ? 'Deselect All' : 'Select All Grades'}
              </span>
            </label>
            <span className="text-xs text-slate-400">
              {selectedRows.length} / {feeRows.length} selected
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {feeRows.map(row => (
              <div
                key={row.gradeId}
                className={[
                  'flex items-center gap-3 px-4 py-3 transition-colors',
                  row.selected ? 'bg-white' : 'bg-slate-50 opacity-60',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  checked={row.selected}
                  onChange={() => toggleGrade(row.gradeId)}
                  className="w-4 h-4 rounded border-slate-300 accent-blue-600 cursor-pointer flex-shrink-0"
                />

                <span className="text-sm font-semibold text-slate-800 w-28 flex-shrink-0">
                  {row.gradeName}
                </span>

                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.tuitionAmount}
                    onChange={e => setRowAmount(row.gradeId, e.target.value)}
                    disabled={!row.selected}
                    placeholder="Amount"
                    className={[
                      'flex-1 min-w-0 text-sm border rounded-lg px-3 py-1.5',
                      'focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400',
                      row.selected
                        ? row.overrideAmount
                          ? 'border-amber-300 bg-amber-50'
                          : 'border-slate-200 bg-white'
                        : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed',
                    ].join(' ')}
                  />
                  <input
                    type="number" step="0.01" min="0"
                    value={row.sportsLevyAmount}
                    onChange={e => setFeeRows(rows => rows.map(r =>
                      r.gradeId === row.gradeId ? { ...r, sportsLevyAmount: e.target.value } : r
                    ))}
                    disabled={!row.selected}
                    placeholder="Sports levy"
                    className={[
                      'w-28 text-sm border rounded-lg px-2 py-1.5',
                      'focus:outline-none focus:ring-2 focus:ring-blue-200',
                      row.selected ? 'border-slate-200 bg-white'
                                   : 'bg-slate-100 border-slate-200 cursor-not-allowed',
                    ].join(' ')}
                  />
                </div>

                <div className="w-24 flex-shrink-0 flex justify-end">
                  {row.selected && row.overrideAmount ? (
                    <button
                      onClick={() => clearOverride(row.gradeId)}
                      title="Reset to shared amount"
                      className="text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1
                                 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg
                                 px-2 py-1 transition-colors"
                    >
                      <FontAwesomeIcon icon={faPen} className="text-[10px]" />
                      Custom
                    </button>
                  ) : row.selected && sharedAmount ? (
                    <span className="text-xs text-blue-500 flex items-center gap-1">
                      <FontAwesomeIcon icon={faLayerGroup} className="text-[10px]" />
                      Shared
                    </span>
                  ) : null}
                </div>
              </div>
            ))}

            {feeRows.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">
                No grades configured. Add grades in the Grades tab first.
              </p>
            )}
          </div>
        </div>

        {/* ── Preview summary ───────────────────────────────────────── */}
        {selectedRows.length > 0 && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Preview — what will be saved
            </p>
            <div className="space-y-1.5">
              {selectedRows.map(r => (
                <div key={r.gradeId} className="flex justify-between text-sm">
                  <span className="text-slate-700 flex items-center gap-2">
                    {r.overrideAmount && (
                      <FontAwesomeIcon icon={faPen} className="text-amber-400 text-[10px]" title="Custom amount" />
                    )}
                    {r.gradeName}
                  </span>
                  <span className={`font-semibold ${Number(r.tuitionAmount) > 0 ? 'text-slate-800' : 'text-red-400'}`}>
                    {Number(r.tuitionAmount) > 0 ? `Tuition: ${formatCurrency(Number(r.tuitionAmount))} | Sports: ${formatCurrency(Number(r.sportsLevyAmount || 0))}` : 'No amount'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Fee Config sub-components (inline, no separate page needed) ───────────────

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

  const UNIFORM_GENDER_OPTIONS = [
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
      <div className="grid grid-cols-3 gap-3 mb-4">
        <FormField label="Item Name">
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Boys Shirt" />
        </FormField>
        <FormField label="Gender">
          <Select options={UNIFORM_GENDER_OPTIONS} value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} />
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
              <button onClick={() => startEdit(item)} className="text-blue-400 hover:text-blue-600 text-xs p-1">
                <FontAwesomeIcon icon={faPen} />
              </button>
              <button onClick={() => handleToggle(item)} className="text-slate-400 hover:text-red-500 text-xs p-1">
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          ))}
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
      <div className="mb-4 w-48">
        <Select
          options={terms.map(t => ({ value: t.id, label: t.name }))}
          value={termId}
          onChange={e => setTermId(e.target.value)}
          placeholder="Select term"
        />
      </div>
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

// ─── Page ──────────────────────────────────────────────────────────────────────

// ─── Per-month tuition editor (inline under each grade row) ──────────────────
function TermMonthEditor({ termFee, onUpdated }) {
  const toast = useToast();
  const [editingId, setEditingId] = useState(null); // termMonthId being edited
  const [editValue, setEditValue] = useState('');
  const [saving,    setSaving]    = useState(false);

  // Derive months list from the termFee's monthFees array
  // monthFees comes from the server: [{ id, termMonthId, monthName, overrideAmount }]
  // We also need the "default" split amount = tuitionAmount / count
  const monthFees   = termFee.monthFees ?? [];
  const monthCount  = monthFees.length;
  const defaultSplit = monthCount > 0
    ? Math.round((termFee.tuitionAmount / monthCount) * 100) / 100
    : 0;

  const getAmount = (mf) => mf.overrideAmount ?? defaultSplit;
  // id === 0 means no DB override row exists — it's the default even split
  const isOverride = (mf) => mf.id > 0;

  const startEdit = (mf) => {
    setEditingId(mf.termMonthId);
    setEditValue(String(getAmount(mf)));
  };

  const cancelEdit = () => { setEditingId(null); setEditValue(''); };

  const handleSave = async (mf) => {
    const num = parseFloat(editValue);
    if (isNaN(num) || num < 0) { toast.error('Enter a valid amount.'); return; }
    setSaving(true);
    try {
      await academicApi.setMonthFee({
        termFeeId:      termFee.id,
        termMonthId:    mf.termMonthId,
        overrideAmount: num,
      });
      toast.success(`${mf.monthName} updated.`);
      setEditingId(null);
      onUpdated?.();
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Failed to save.');
    } finally { setSaving(false); }
  };

  const handleReset = async (mf) => {
    try {
      await academicApi.deleteMonthFee(termFee.id, mf.termMonthId);
      toast.success(`${mf.monthName} reset to even split.`);
      onUpdated?.();
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Failed to reset.');
    }
  };

  if (monthCount === 0) {
    return (
      <p className="text-xs text-slate-400 italic px-2 py-1">
        No month data — reload the page after setting fees.
      </p>
    );
  }

  return (
    <div className="mt-2 mb-1 flex flex-wrap gap-2">
      {monthFees.map(mf => {
        const isEditing = editingId === mf.termMonthId;
        const overridden = isOverride(mf);
        return (
          <div
            key={mf.termMonthId}
            className={`flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5 text-xs group
              ${overridden ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}`}
          >
            <span className={`font-medium ${overridden ? 'text-blue-700' : 'text-slate-600'}`}>
              {mf.monthName}
            </span>
            {isEditing ? (
              <>
                <input
                  type="number" step="0.01" min="0"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(mf); if (e.key === 'Escape') cancelEdit(); }}
                  className="w-16 border border-blue-300 rounded px-1.5 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                  autoFocus
                />
                <button onClick={() => handleSave(mf)} disabled={saving}
                  className="text-emerald-600 hover:text-emerald-800 font-bold">
                  <FontAwesomeIcon icon={faCheck} />
                </button>
                <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600">✕</button>
              </>
            ) : (
              <>
                <span className={`tabular-nums font-semibold ${overridden ? 'text-blue-800' : 'text-slate-800'}`}>
                  ${getAmount(mf).toFixed(2)}
                </span>
                {overridden && <span className="text-blue-400 text-[10px]">✎</span>}
                <button
                  onClick={() => startEdit(mf)}
                  className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-blue-500 transition-opacity"
                  title="Edit">
                  <FontAwesomeIcon icon={faPen} />
                </button>
                {overridden && (
                  <button
                    onClick={() => handleReset(mf)}
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-opacity"
                    title="Reset to even split">
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}
      <p className="w-full text-[10px] text-slate-400 mt-0.5">
        Hover a month to edit. <span className="text-blue-500">Blue ✎</span> = overridden. Trash resets to even split.
      </p>
    </div>
  );
}

// ─── Term Extension Months card ────────────────────────────────────────────────
const MONTH_OPTIONS = [
  { value: 1,  label: 'January'   }, { value: 2,  label: 'February'  },
  { value: 3,  label: 'March'     }, { value: 4,  label: 'April'     },
  { value: 5,  label: 'May'       }, { value: 6,  label: 'June'      },
  { value: 7,  label: 'July'      }, { value: 8,  label: 'August'    },
  { value: 9,  label: 'September' }, { value: 10, label: 'October'   },
  { value: 11, label: 'November'  }, { value: 12, label: 'December'  },
];

function TermExtensionCard({ terms }) {
  const toast = useToast();
  const [termId,      setTermId]      = useState('');
  const [termMonths,  setTermMonths]  = useState([]);
  const [extensions,  setExtensions]  = useState([]);
  const [grades,      setGrades]      = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [addingMonth, setAddingMonth] = useState(false);
  const [newMonth,    setNewMonth]    = useState('');
  const [editingFee,  setEditingFee]  = useState(null);
  const [savingFee,   setSavingFee]   = useState(false);

  useEffect(() => {
    if (!termId && terms.length) setTermId(String(terms[0].id));
  }, [terms, termId]);

  useEffect(() => {
    academicApi.getGrades()
      .then(r => setGrades(r?.data?.data ?? r?.data ?? []))
      .catch(() => {});
  }, []);

  // Fetch regular months directly from API so the available-months filter is always correct
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
      toast.success('Grade removed.');
      await load();
    } catch (e) { toast.error(e?.response?.data?.message ?? 'Failed to remove.'); }
  };

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

      <div className="mb-5 w-48">
        <Select
          options={terms.map(t => ({ value: t.id, label: t.name }))}
          value={termId}
          onChange={e => { setTermId(e.target.value); setNewMonth(''); }}
          placeholder="Select term"
        />
      </div>

      {/* Add extension month panel */}
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
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <FontAwesomeIcon icon={faCalendarPlus} className="text-blue-400" />
                <span className="font-semibold text-slate-800">{em.monthName}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${em.isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                  {em.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="text-xs text-slate-400">
                  {em.fees.length === 0 ? 'No grades configured' : `${em.fees.length} grade${em.fees.length === 1 ? '' : 's'}`}
                </span>
                <div className="ml-auto flex items-center gap-2">
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
                  >
                    <FontAwesomeIcon icon={faTrash} /> Remove
                  </button>
                </div>
              </div>

              <div className="space-y-1 mb-3">
                {em.fees.length === 0 ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                    <span className="text-amber-500 text-xs">⚠</span>
                    <p className="text-xs text-amber-700">
                      No grades configured yet — add grades below. Until at least one grade is added no student will see this fee.
                    </p>
                  </div>
                ) : em.fees.map(ef => {
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
                          <button onClick={handleSaveFee} disabled={savingFee} className="text-emerald-600 hover:text-emerald-800 text-xs font-bold px-1">
                            <FontAwesomeIcon icon={faCheck} />
                          </button>
                          <button onClick={() => setEditingFee(null)} className="text-slate-400 hover:text-slate-600 text-xs px-1">✕</button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-semibold text-slate-700 w-20 text-right tabular-nums">{formatCurrency(ef.amount)}</span>
                          <button onClick={() => startEditFee(em, ef.gradeId, ef.amount)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-blue-500 text-xs transition-opacity" title="Edit amount">
                            <FontAwesomeIcon icon={faPen} />
                          </button>
                          <button onClick={() => handleRemoveFee(em, ef.gradeId)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 text-xs transition-opacity" title="Remove grade">
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <AddGradeFeeRow em={em} grades={grades} onSaved={load} />
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-400 mt-4 italic">
        Hover a grade row to edit its amount or remove it. Inactive months are hidden from the payment screen entirely.
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
    <p className="text-xs text-slate-400 italic pt-2 border-t border-slate-100">All grades configured for this month.</p>
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

export default function AcademicPage() {
  const dispatch   = useAppDispatch();
  const toast      = useToast();
  const { role }   = useAuth();
  const isAdmin    = role === 'Admin';

  const grades     = useAppSelector(selectGrades);
  const years      = useAppSelector(selectYears);
  const activeYear = useAppSelector(selectActiveYear);
  const terms      = useAppSelector(selectTerms);
  const activeTerm = useAppSelector(selectActiveTerm);
  const termFees   = useAppSelector(selectTermFees);

  const TABS = isAdmin ? ALL_TABS : PUBLIC_TABS;

  const [tab,          setTab]          = useState(0);
  const [modal,        setModal]        = useState(null);
  const [form,         setForm]         = useState({});
  const [saving,       setSaving]       = useState(false);
  const [feeModalKey,  setFeeModalKey]  = useState(0);
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [expandedGrade, setExpandedGrade] = useState(null);

  useEffect(() => {
    dispatch(fetchGrades());
    dispatch(fetchYears());
    dispatch(fetchActiveYear());
    dispatch(fetchActiveTerm());
  }, [dispatch]);

  useEffect(() => { if (activeYear) dispatch(fetchTerms(activeYear.id)); }, [dispatch, activeYear]);
  useEffect(() => { if (activeTerm) dispatch(fetchTermFees(activeTerm.id)); }, [dispatch, activeTerm]);


  useEffect(() => {
    if (tab === 3 && activeTerm) dispatch(fetchTermFees(activeTerm.id));
  }, [tab, activeTerm, dispatch]);

  const set        = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const openModal  = (name, init = {}) => { setModal(name); setForm(init); };
  const closeModal = () => { setModal(null); setForm({}); };

  const openFeeModal = () => {
    setFeeModalKey(k => k + 1);
    setFeeModalOpen(true);
  };

  const save = async () => {
    if (modal === 'term' && !activeYear?.id) {
      toast.error('Please set an active academic year before adding terms.');
      return;
    }
    setSaving(true);
    let res;
    if (modal === 'grade') res = await dispatch(createGrade({ name: form.name, level: Number(form.level) }));
    if (modal === 'year')  res = await dispatch(createYear({ year: Number(form.year), name: form.name || String(form.year) }));
    if (modal === 'term')  res = await dispatch(createTerm({
      name:           form.name,
      academicYearId: activeYear.id,
      termNumber:     Number(form.termNumber),
      startDate:      form.startDate,
      endDate:        form.endDate,
      monthNumbers:   form.months?.split(',').map(s => Number(s.trim())).filter(Boolean) ?? [],
    }));
    setSaving(false);
    const ok = res && (
      createGrade.fulfilled.match(res) ||
      createYear.fulfilled.match(res)  ||
      createTerm.fulfilled.match(res)
    );
    if (ok) { toast.success('Saved successfully.'); closeModal(); }
    else    toast.error(res?.payload ?? 'Failed to save.');
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Academic Setup" subtitle="Manage grades, years, terms, fee schedules and fee configuration" />

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={[
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === i ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700',
            ].join(' ')}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Grades ──────────────────────────────────────────────────────── */}
      {tab === 0 && (
        <Card>
          <CardHeader title="Grades"
            subtitle={`${grades.length} grade${grades.length !== 1 ? 's' : ''} configured`}
            action={<Button size="xs" icon={faPlus} onClick={() => openModal('grade')}>Add Grade</Button>}
          />
          <div className="divide-y divide-slate-100">
            {grades.map(g => (
              <div key={g.id} className="flex items-center justify-between py-3">
                <span className="font-medium text-slate-800">{g.name}</span>
                <Badge variant="slate">Level {g.level}</Badge>
              </div>
            ))}
            {grades.length === 0 && <p className="text-sm text-slate-400 py-6 text-center">No grades yet.</p>}
          </div>
        </Card>
      )}

      {/* ── Academic Years ───────────────────────────────────────────────── */}
      {tab === 1 && (
        <Card>
          <CardHeader title="Academic Years"
            action={<Button size="xs" icon={faPlus} onClick={() => openModal('year')}>Add Year</Button>}
          />
          <div className="divide-y divide-slate-100">
            {years.map(y => (
              <div key={y.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{y.name}</span>
                  {y.isActive && <Badge variant="green">Active</Badge>}
                </div>
                {!y.isActive && (
                  <Button size="xs" variant="ghost" icon={faCheck}
                    onClick={() => dispatch(setActiveYear(y.id))}>
                    Set Active
                  </Button>
                )}
              </div>
            ))}
            {years.length === 0 && <p className="text-sm text-slate-400 py-6 text-center">No academic years yet.</p>}
          </div>
        </Card>
      )}

      {/* ── Terms ────────────────────────────────────────────────────────── */}
      {tab === 2 && (
        <Card>
          <CardHeader
            title={`Terms — ${activeYear?.name ?? '…'}`}
            action={
              <Button size="xs" icon={faPlus} onClick={() => openModal('term')} disabled={!activeYear}>
                Add Term
              </Button>
            }
          />
          <div className="divide-y divide-slate-100">
            {terms.map(t => (
              <div key={t.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">{t.name}</span>
                    {t.isActive && <Badge variant="green">Active</Badge>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {(t.termMonths ?? t.months ?? [])
                      .map(m => (typeof m === 'object' ? m.monthName : m))
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </p>
                </div>
                {!t.isActive && (
                  <Button size="xs" variant="ghost" icon={faCheck}
                    onClick={() => dispatch(setActiveTerm({ id: t.id, yearId: activeYear?.id }))}>
                    Set Active
                  </Button>
                )}
              </div>
            ))}
            {terms.length === 0 && <p className="text-sm text-slate-400 py-6 text-center">No terms yet.</p>}
          </div>
        </Card>
      )}

      {/* ── Term Fees ────────────────────────────────────────────────────── */}
      {tab === 3 && (
        <Card>
          <CardHeader
            title={`Fees — ${activeTerm?.name ?? '…'}`}
            subtitle={
              termFees.length > 0
                ? `${termFees.length} grade${termFees.length !== 1 ? 's' : ''} configured`
                : 'No fees set yet'
            }
            action={
              <Button size="xs" icon={faMoneyBillWave} onClick={openFeeModal} disabled={!activeTerm}>
                {termFees.length > 0 ? 'Edit Fees' : 'Set Fees'}
              </Button>
            }
          />

          {!activeTerm && (
            <div className="text-center py-8 text-sm text-slate-400">
              Set an active term in the Terms tab first.
            </div>
          )}

          {activeTerm && termFees.length === 0 && (
            <div className="text-center py-10">
              <FontAwesomeIcon icon={faMoneyBillWave} className="text-3xl text-slate-200 mb-3 block" />
              <p className="text-sm text-slate-400 mb-3">No fees configured for {activeTerm.name}.</p>
              <Button size="sm" icon={faPlus} onClick={openFeeModal}>Configure Fees</Button>
            </div>
          )}

          {termFees.length > 0 && (
            <div className="divide-y divide-slate-100">
              {termFees.map(f => {
                const detail = f;
                const isExpanded = expandedGrade === f.id;
                return (
                  <div key={f.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-800">{f.gradeName}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900">
                          {`Tuition: ${formatCurrency(f.tuitionAmount ?? f.amount ?? 0)} | Sports: ${formatCurrency(f.sportsLevyAmount ?? 0)}`}
                        </span>
                        {f.staffChildTuitionAmount && (
                          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            Staff child: {formatCurrency(f.staffChildTuitionAmount)}
                          </span>
                        )}
                        <button
                          onClick={() => setExpandedGrade(isExpanded ? null : f.id)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-2 py-1 transition-colors"
                          title="Edit monthly amounts"
                        >
                          <FontAwesomeIcon icon={faCalendarDays} className="text-[10px]" />
                          Monthly
                          <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} className="text-[10px]" />
                        </button>
                        <button
                          onClick={openFeeModal}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit fees"
                        >
                          <FontAwesomeIcon icon={faPen} className="text-xs" />
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <TermMonthEditor
                        termFee={detail}
                        onUpdated={() => activeTerm && dispatch(fetchTermFees(activeTerm.id))}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── Fee Config (Admin only) ───────────────────────────────────────── */}
      {tab === 4 && isAdmin && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-700">
            Configuring standalone fees for: <strong>{activeYear?.name ?? '…'}</strong>
          </div>
          {!activeYear?.id ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              No active academic year found. Set an active year in the Academic Years tab first.
            </div>
          ) : (
            <div className="space-y-4">
              <AmountSettingCard
                icon={faIdCard} title="Registration Fee"
                subtitle="Grade 6 (once/year) and Grade 7 (Terms 1 & 2 only)"
                yearId={activeYear.id} getter={feesApi.getRegistration} setter={feesApi.setRegistration}
              />
              <AmountSettingCard
                icon={faBook} title="Report Book Fee"
                subtitle="Compulsory for new enrolments; students can buy replacements"
                yearId={activeYear.id} getter={feesApi.getReportBook} setter={feesApi.setReportBook}
              />
              <AmountSettingCard
                icon={faDoorOpen} title="Admission Fee"
                subtitle="One-time fee for students enrolling within the active term"
                yearId={activeYear.id} getter={feesApi.getAdmission} setter={feesApi.setAdmission}
              />
              <AmountSettingCard
                icon={faBus} title="Transport Fee"
                subtitle="Optional monthly fee — shown per month on payment screen"
                yearId={activeYear.id} getter={feesApi.getTransport} setter={feesApi.setTransport}
                fieldLabel="Monthly Amount (USD)" fieldKey="monthlyAmount"
              />
              <AmountSettingCard
                icon={faFlask} title="Project Fee"
                subtitle="Grade 6 &amp; 7 — students may start paying in Grade 6 and complete in Grade 7"
                yearId={activeYear.id} getter={feesApi.getProject} setter={feesApi.setProject}
              />
              <UniformItemsCard />
              <TripsCard terms={terms} />
              <TermExtensionCard terms={terms} />
            </div>
          )}
        </div>
      )}

      {/* ── Grade modal ──────────────────────────────────────────────────── */}
      <Modal isOpen={modal === 'grade'} onClose={closeModal} title="Add Grade" size="sm"
        onConfirm={save} confirmLabel="Add Grade" loading={saving}>
        <div className="space-y-4">
          <FormField label="Grade Name" required>
            <Input value={form.name ?? ''} onChange={set('name')} placeholder="e.g. Grade 1" />
          </FormField>
          <FormField label="Level" required hint="Used for ordering (e.g. ECD A = 0, Grade 1 = 1)">
            <Input type="number" value={form.level ?? ''} onChange={set('level')} placeholder="0" />
          </FormField>
        </div>
      </Modal>

      {/* ── Academic year modal ──────────────────────────────────────────── */}
      <Modal isOpen={modal === 'year'} onClose={closeModal} title="Add Academic Year" size="sm"
        onConfirm={save} confirmLabel="Add Year" loading={saving}>
        <div className="space-y-4">
          <FormField label="Year" required hint="The calendar year, e.g. 2026">
            <Input
              type="number"
              value={form.year ?? ''}
              onChange={e => setForm(f => ({ ...f, year: e.target.value, name: f.name || e.target.value }))}
              placeholder={String(new Date().getFullYear())}
            />
          </FormField>
          <FormField label="Display Name" hint="Optional — defaults to the year number if left blank">
            <Input value={form.name ?? ''} onChange={set('name')} placeholder="e.g. 2026" />
          </FormField>
        </div>
      </Modal>

      {/* ── Term modal ───────────────────────────────────────────────────── */}
      <Modal isOpen={modal === 'term'} onClose={closeModal} title="Add Term" size="sm"
        onConfirm={save} confirmLabel="Add Term" loading={saving}>
        <div className="space-y-4">
          <FormField label="Term Name" required>
            <Input value={form.name ?? ''} onChange={set('name')} placeholder="e.g. Term 1" />
          </FormField>
          <FormField label="Term Number">
            <Input type="number" value={form.termNumber ?? ''} onChange={set('termNumber')} placeholder="1" />
          </FormField>
          <FormField label="Months" hint="Comma-separated month numbers, e.g. 1,2,3 for Jan–Mar">
            <Input value={form.months ?? ''} onChange={set('months')} placeholder="1,2,3" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start Date">
              <Input type="date" value={form.startDate ?? ''} onChange={set('startDate')} />
            </FormField>
            <FormField label="End Date">
              <Input type="date" value={form.endDate ?? ''} onChange={set('endDate')} />
            </FormField>
          </div>
        </div>
      </Modal>

      {/* ── Multi-grade fee modal (remounted fresh on every open via key) ─── */}
      {feeModalOpen && (
        <TermFeeModal
          key={feeModalKey}
          onClose={() => setFeeModalOpen(false)}
          grades={grades}
          activeTerm={activeTerm}
          existingFees={termFees}
          onSaved={() => activeTerm && dispatch(fetchTermFees(activeTerm.id))}
        />
      )}
    </div>
  );
}