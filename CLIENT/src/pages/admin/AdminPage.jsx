import { useEffect, useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserPlus, faUserCheck, faUserXmark,
  faPen, faPlus, faToggleOn, faToggleOff,
  faCoins, faArrowTrendUp, faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';
import { useAppDispatch, useAppSelector, useToast } from '../../hooks';
import { fetchUsers, registerUser, deactivateUser, reactivateUser, selectStaffUsers } from '../../store/slices/authSlice';
import { selectSettings, selectSettingsSaving, saveSetting } from '../../store/slices/settingsSlice';
import { validateRegisterForm } from '../../utils/validators';
import { ROLE_OPTIONS } from '../../utils/constants';
import { adminApi } from '../../api/services';
import { useApi } from '../../hooks';
import { SectionHeader, Card, CardHeader } from '../../components/ui/Card';
import { RoleBadge, Badge } from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import { Input, Select, FormField } from '../../components/forms/FormControls';
import Button from '../../components/ui/Button';
import { formatDateTime } from '../../utils/formatters';

// Admin tabs — Fee Config has moved to Academic page
const TABS = ['Staff Accounts', 'Payment Methods', 'ZiG Rate', 'System Settings', 'Audit Logs'];
const EMPTY_REG    = { firstName: '', lastName: '', email: '', password: '', role: '' };
const EMPTY_METHOD = { name: '', code: '', requiresReference: false };
const EMPTY_AUDIT_FILTERS = { action: '', entityName: '', from: '', to: '' };

const formatAuditJson = (value) => {
  if (value === null || value === undefined || value === '') return '—';

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '—';

    try {
      const parsed = JSON.parse(trimmed);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return trimmed;
    }
  }

  if (typeof value === 'object') return JSON.stringify(value, null, 2);

  return String(value);
};

// ─── ZiG Rate panel ───────────────────────────────────────────────────────────
function ZigRatePanel() {
  const toast = useToast();
  const [current,  setCurrent]  = useState(null);
  const [history,  setHistory]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ ratePerUsd: '', notes: '' });
  const [errors,   setErrors]   = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rateRes, histRes] = await Promise.allSettled([
        adminApi.getZigRate(),
        adminApi.getZigRateHistory(),
      ]);
      if (rateRes.status === 'fulfilled') {
        setCurrent(rateRes.value?.data?.data ?? rateRes.value?.data ?? null);
      }
      if (histRes.status === 'fulfilled') {
        const h = histRes.value?.data?.data ?? histRes.value?.data ?? [];
        setHistory(Array.isArray(h) ? h : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const validate = () => {
    const errs = {};
    const v = parseFloat(form.ratePerUsd);
    if (!form.ratePerUsd || isNaN(v) || v <= 0)
      errs.ratePerUsd = 'Enter a valid rate greater than 0.';
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await adminApi.setZigRate({
        ratePerUsd: parseFloat(form.ratePerUsd),
        notes: form.notes || null,
      });
      toast.success(`ZiG rate updated to ${form.ratePerUsd} ZiG/USD.`);
      setShowForm(false);
      setForm({ ratePerUsd: '', notes: '' });
      setErrors({});
      await load();
    } catch {
      toast.error('Failed to update ZiG rate.');
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n) => n != null ? Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '—';
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-ZW', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="ZiG Exchange Rate"
          subtitle="Controls how ZiG payments are converted to USD for accounting"
          action={
            <Button size="sm" icon={faCoins} onClick={() => setShowForm(s => !s)}>
              {showForm ? 'Cancel' : 'Set New Rate'}
            </Button>
          }
        />

        {loading ? (
          <div className="py-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : current ? (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Current Rate</p>
              <p className="text-3xl font-black text-emerald-700">
                ZiG {fmt(current.ratePerUsd)}
                <span className="text-base font-medium text-emerald-500 ml-1">= USD 1</span>
              </p>
              <p className="text-xs text-emerald-600 mt-2">
                Effective from {fmtDate(current.effectiveFrom)}
              </p>
              {current.notes && (
                <p className="text-xs text-slate-500 mt-1 italic">"{current.notes}"</p>
              )}
              <p className="text-xs text-slate-400 mt-2">Set by {current.setByName}</p>
            </div>
            <div className="flex-1 bg-blue-50 border border-blue-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Quick Conversion</p>
              <div className="space-y-1 text-sm text-blue-800">
                {[100, 500, 1000, 5000].map(zig => (
                  <div key={zig} className="flex justify-between">
                    <span>ZiG {zig.toLocaleString()}</span>
                    <span className="font-semibold">= USD {(zig / current.ratePerUsd).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center bg-amber-50 border border-amber-200 rounded-xl">
            <FontAwesomeIcon icon={faCoins} className="text-amber-400 text-2xl mb-2" />
            <p className="text-sm font-semibold text-amber-700">No ZiG rate configured</p>
            <p className="text-xs text-amber-600 mt-1">ZiG payments cannot be accepted until a rate is set.</p>
          </div>
        )}

        {showForm && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <p className="text-sm font-semibold text-slate-700">
              <FontAwesomeIcon icon={faArrowTrendUp} className="mr-1.5 text-blue-500" />
              Set Weekly ZiG Rate
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="ZiG per USD" error={errors.ratePerUsd} required
                hint="How many ZiG equal 1 USD (e.g. 26.50)">
                <Input
                  type="number" step="0.0001" min="0.0001"
                  value={form.ratePerUsd}
                  onChange={e => setForm(f => ({ ...f, ratePerUsd: e.target.value }))}
                  error={errors.ratePerUsd}
                  placeholder="e.g. 26.50"
                />
              </FormField>
              <FormField label="Notes (optional)" hint="e.g. RBZ rate week of 10 June">
                <Input
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional note"
                />
              </FormField>
            </div>
            {form.ratePerUsd > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                Preview: ZiG 100 = USD {(100 / parseFloat(form.ratePerUsd || 1)).toFixed(2)} &nbsp;|&nbsp;
                ZiG 1,000 = USD {(1000 / parseFloat(form.ratePerUsd || 1)).toFixed(2)} &nbsp;|&nbsp;
                ZiG 5,000 = USD {(5000 / parseFloat(form.ratePerUsd || 1)).toFixed(2)}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => { setShowForm(false); setErrors({}); }}>Cancel</Button>
              <Button size="sm" icon={faCheckCircle} loading={saving} onClick={handleSave}>
                Activate Rate
              </Button>
            </div>
          </div>
        )}
      </Card>

      {history.length > 0 && (
        <Card>
          <CardHeader title="Rate History" subtitle="All previous ZiG rates — newest first" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase border-b border-slate-100">
                  <th className="pb-2 pr-4">Rate (ZiG/USD)</th>
                  <th className="pb-2 pr-4">Effective From</th>
                  <th className="pb-2 pr-4">Effective To</th>
                  <th className="pb-2 pr-4">Set By</th>
                  <th className="pb-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id} className={`border-b border-slate-50 ${r.isCurrent ? 'bg-emerald-50' : ''}`}>
                    <td className="py-2 pr-4 font-semibold">
                      {fmt(r.ratePerUsd)}
                      {r.isCurrent && <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">CURRENT</span>}
                    </td>
                    <td className="py-2 pr-4 text-slate-600">{fmtDate(r.effectiveFrom)}</td>
                    <td className="py-2 pr-4 text-slate-400">{r.effectiveTo ? fmtDate(r.effectiveTo) : '—'}</td>
                    <td className="py-2 pr-4 text-slate-600">{r.setByName}</td>
                    <td className="py-2 text-slate-400 italic text-xs">{r.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Settings panel ───────────────────────────────────────────────────────────
function SettingsPanel() {
  const dispatch      = useAppDispatch();
  const toast         = useToast();
  const reduxSettings = useAppSelector(selectSettings);
  const saving        = useAppSelector(selectSettingsSaving);
  const [form, setForm] = useState({ ...reduxSettings });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const FIELDS = [
    { key: 'schoolName',    label: 'School Name'         },
    { key: 'schoolMotto',   label: 'School Motto'        },
    { key: 'schoolAddress', label: 'Address Line 1'      },
    { key: 'schoolCity',    label: 'City / District'     },
    { key: 'schoolPhone',   label: 'Phone Number'        },
    { key: 'schoolEmail',   label: 'Email Address'       },
    { key: 'receiptFooter', label: 'Receipt Footer Text' },
  ];

  const saveAll = async () => {
    for (const { key } of FIELDS) {
      await dispatch(saveSetting({ key, value: form[key] || '' }));
    }
    toast.success('Settings saved.');
  };

  return (
    <Card>
      <CardHeader
        title="School Settings"
        subtitle="These values appear on every printed receipt"
        action={<Button size="sm" onClick={saveAll} loading={saving}>Save All</Button>}
      />
      <div className="mb-5 p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700">
        <strong>Tip:</strong> Changes here update the receipt header immediately after saving.
      </div>
      <div className="space-y-4">
        {FIELDS.map(({ key, label }) => (
          <FormField key={key} label={label}>
            <div className="flex gap-2">
              <Input value={form[key] ?? ''} onChange={set(key)} placeholder={label} className="flex-1" />
              <Button size="sm" variant="secondary"
                onClick={() => dispatch(saveSetting({ key, value: form[key] || '' }))}
                loading={saving}>Save</Button>
            </div>
          </FormField>
        ))}
      </div>
      <div className="mt-6 pt-5 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Receipt Header Preview</p>
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-4 text-center text-blue-900" style={{ fontFamily: 'Arial, sans-serif' }}>
          <p className="text-[9px] font-bold uppercase tracking-widest">RECEIPT <span className="text-red-600">XXXXX</span></p>
          <p className="text-[15px] font-black uppercase">{form.schoolName || 'Rock Out College'}</p>
          <p className="text-[8px] font-bold">{form.schoolMotto || 'Patience, Perseverance & Prosperity'}</p>
          <p className="text-[7.5px]">{form.schoolAddress}</p>
          <p className="text-[7.5px]">{form.schoolCity}, Cell: {form.schoolPhone}</p>
        </div>
      </div>
    </Card>
  );
}

// ─── Payment Methods panel ────────────────────────────────────────────────────
function PaymentMethodsPanel() {
  const toast = useToast();

  const [methods,    setMethods]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [showAdd,    setShowAdd]    = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form,       setForm]       = useState(EMPTY_METHOD);
  const [saving,     setSaving]     = useState(false);
  const [errors,     setErrors]     = useState({});

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getPaymentMethods();
      setMethods(res.data?.data ?? []);
    } catch {
      toast.error('Failed to load payment methods.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await adminApi.getPaymentMethods();
        if (!cancelled) setMethods(res.data?.data ?? []);
      } catch {
        if (!cancelled) toast.error('Failed to load payment methods.');
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [k]: val }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim())                    errs.name = 'Name is required.';
    if (!editTarget && !form.code.trim())     errs.code = 'Code is required.';
    if (!editTarget && !/^[A-Z0-9_]+$/.test(form.code.toUpperCase()))
      errs.code = 'Code must be uppercase letters, numbers or underscores.';
    return errs;
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_METHOD);
    setErrors({});
    setShowAdd(true);
  };

  const openEdit = (m) => {
    setEditTarget(m);
    setForm({ name: m.name, code: m.code, requiresReference: m.requiresReference, isActive: m.isActive });
    setErrors({});
    setShowAdd(true);
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      if (editTarget) {
        await adminApi.updatePaymentMethod(editTarget.id, {
          name:              form.name.trim(),
          requiresReference: !!form.requiresReference,
          isActive:          form.isActive !== false,
        });
        toast.success('Payment method updated.');
      } else {
        await adminApi.createPaymentMethod({
          name:              form.name.trim(),
          code:              form.code.trim().toUpperCase(),
          requiresReference: !!form.requiresReference,
        });
        toast.success(`"${form.name}" added.`);
      }
      setShowAdd(false);
      reload();
    } catch (err) {
      toast.error(err.message ?? 'Failed to save.');
    }
    setSaving(false);
  };

  const toggleActive = async (m) => {
    try {
      await adminApi.updatePaymentMethod(m.id, {
        name:              m.name,
        requiresReference: m.requiresReference,
        isActive:          !m.isActive,
      });
      toast.success(`${m.name} ${!m.isActive ? 'activated' : 'deactivated'}.`);
      reload();
    } catch {
      toast.error('Failed to update.');
    }
  };

  const COLS = [
    { key: 'name', label: 'Method Name', render: r => <span className="font-semibold text-slate-800">{r.name}</span> },
    { key: 'code', label: 'Code',        render: r => <code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-mono">{r.code}</code> },
    { key: 'requiresReference', label: 'Requires Ref?', align: 'center',
      render: r => <Badge variant={r.requiresReference ? 'blue' : 'slate'}>{r.requiresReference ? 'Yes' : 'No'}</Badge> },
    { key: 'isActive', label: 'Status', align: 'center',
      render: r => <Badge variant={r.isActive ? 'green' : 'slate'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
    { key: 'actions', label: '', align: 'right',
      render: r => (
        <div className="flex gap-1 justify-end">
          <Button size="xs" variant="ghost" icon={faPen} onClick={() => openEdit(r)}>Edit</Button>
          <Button size="xs" variant="ghost"
            icon={r.isActive ? faToggleOff : faToggleOn}
            onClick={() => toggleActive(r)}>
            {r.isActive ? 'Disable' : 'Enable'}
          </Button>
        </div>
      )},
  ];

  return (
    <>
      <Card>
        <CardHeader
          title="Payment Methods"
          subtitle={`${methods.length} method${methods.length !== 1 ? 's' : ''} configured`}
          action={<Button size="sm" icon={faPlus} onClick={openAdd}>Add Method</Button>}
        />
        <Table columns={COLS} data={methods} loading={loading} emptyMessage="No payment methods found." />
      </Card>

      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title={editTarget ? `Edit — ${editTarget.name}` : 'Add Payment Method'}
        size="sm"
        onConfirm={handleSave}
        confirmLabel={editTarget ? 'Save Changes' : 'Add Method'}
        loading={saving}
      >
        <div className="space-y-4">
          <FormField label="Method Name" required error={errors.name}>
            <Input value={form.name} onChange={set('name')} error={errors.name}
              placeholder="e.g. EcoCash" />
          </FormField>

          {!editTarget && (
            <FormField label="Code" required error={errors.code}
              hint="Short uppercase identifier, e.g. ECOCASH. Cannot be changed after creation.">
              <Input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') }))}
                error={errors.code}
                placeholder="ECOCASH"
                className="font-mono"
              />
            </FormField>
          )}

          {editTarget && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <code className="text-xs font-mono text-slate-500 flex-1">{editTarget.code}</code>
              <span className="text-xs text-slate-400">Code is fixed after creation</span>
            </div>
          )}

          <FormField label="Options">
            <div className="space-y-3 pt-1">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!form.requiresReference}
                  onChange={set('requiresReference')}
                  className="w-4 h-4 rounded border-slate-300 accent-blue-600"
                />
                <div>
                  <p className="text-sm font-medium text-slate-700">Requires Reference Number</p>
                  <p className="text-xs text-slate-400">Cashier must enter a transaction ref (e.g. EcoCash, bank transfer)</p>
                </div>
              </label>

              {editTarget && (
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.isActive !== false}
                    onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 accent-blue-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Active</p>
                    <p className="text-xs text-slate-400">Inactive methods won't appear when recording payments</p>
                  </div>
                </label>
              )}
            </div>
          </FormField>
        </div>
      </Modal>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const dispatch = useAppDispatch();
  const toast    = useToast();
  const users    = useAppSelector(selectStaffUsers);

  const { execute: getAuditLogs, data: auditData, loading: auditLoading } = useApi(adminApi.getAuditLogs);
  const { execute: getAuditLogOptions, data: auditOptionsData } = useApi(adminApi.getAuditLogOptions);

  const [tab,     setTab]     = useState(0);
  const [showReg, setShowReg] = useState(false);
  const [regForm, setRegForm] = useState(EMPTY_REG);
  const [regErr,  setRegErr]  = useState({});
  const [saving,  setSaving]  = useState(false);
  const [auditFilters, setAuditFilters] = useState(EMPTY_AUDIT_FILTERS);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(20);
  const [selectedAudit, setSelectedAudit] = useState(null);

  useEffect(() => { dispatch(fetchUsers()); }, [dispatch]);

  useEffect(() => {
    if (tab === 4) getAuditLogOptions();
  }, [tab, getAuditLogOptions]);

  useEffect(() => {
    if (tab !== 4) return;

    const query = {
      page: auditPage,
      pageSize: auditPageSize,
    };

    if (auditFilters.action.trim()) query.action = auditFilters.action.trim();
    if (auditFilters.entityName.trim()) query.entityName = auditFilters.entityName.trim();
    if (auditFilters.from) query.from = new Date(`${auditFilters.from}T00:00:00`).toISOString();
    if (auditFilters.to) query.to = new Date(`${auditFilters.to}T23:59:59`).toISOString();

    getAuditLogs(query);
  }, [tab, auditPage, auditPageSize, auditFilters, getAuditLogs]);

  const setReg = k => e => setRegForm(f => ({ ...f, [k]: e.target.value }));

  const handleRegister = async (e) => {
    e.preventDefault();
    const errs = validateRegisterForm(regForm);
    if (Object.values(errs).some(Boolean)) { setRegErr(errs); return; }
    setSaving(true);
    const res = await dispatch(registerUser(regForm));
    setSaving(false);
    if (registerUser.fulfilled.match(res)) {
      toast.success(`${regForm.firstName} ${regForm.lastName} added as ${regForm.role}.`);
      setShowReg(false); setRegForm(EMPTY_REG); setRegErr({});
    } else toast.error('Failed to register user.');
  };

  const handleDeactivate = async (id) => { await dispatch(deactivateUser(id));  toast.success('User deactivated.'); };
  const handleReactivate = async (id) => { await dispatch(reactivateUser(id)); toast.success('User reactivated.'); };

  const USER_COLS = [
    { key: 'name',      label: 'Name',       render: r => <span className="font-medium">{r.firstName} {r.lastName}</span> },
    { key: 'email',     label: 'Email',      render: r => <span className="text-slate-500 text-xs">{r.email}</span> },
    { key: 'role',      label: 'Role',       render: r => <RoleBadge role={r.role} /> },
    { key: 'isActive',  label: 'Status',     align: 'center',
      render: r => <Badge variant={r.isActive ? 'green' : 'slate'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
    { key: 'lastLogin', label: 'Last Login', render: r => formatDateTime(r.lastLogin) ?? '—' },
    { key: 'actions',   label: '',           align: 'right',
      render: r => (
        <div className="flex gap-1 justify-end">
          {r.isActive
            ? <Button size="xs" variant="ghost" icon={faUserXmark} onClick={() => handleDeactivate(r.id)}>Deactivate</Button>
            : <Button size="xs" variant="ghost" icon={faUserCheck} onClick={() => handleReactivate(r.id)}>Reactivate</Button>
          }
        </div>
      )},
  ];

  const AUDIT_COLS = [
    { key: 'timestamp',  label: 'Time',   render: r => <span className="text-xs font-mono">{formatDateTime(r.timestamp)}</span> },
    { key: 'userName',   label: 'User'    },
    { key: 'action',     label: 'Action', render: r => <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{r.action}</code> },
    { key: 'entityName', label: 'Entity'  },
    { key: 'entityId',   label: 'ID',     align: 'center' },
    { key: 'success',    label: 'Result', align: 'center',
      render: r => <Badge variant={r.success !== false ? 'green' : 'red'}>{r.success !== false ? 'OK' : 'Failed'}</Badge> },
  ];

  const handleAuditFilterChange = (key, value) => {
    setAuditPage(1);
    setAuditFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearAuditFilters = () => {
    setAuditPage(1);
    setAuditFilters(EMPTY_AUDIT_FILTERS);
  };

  const auditActionOptions = (auditOptionsData?.actions ?? []).map((value) => ({ value, label: value }));
  const auditEntityOptions = (auditOptionsData?.entities ?? []).map((value) => ({ value, label: value }));

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Administration"
        subtitle="Manage staff accounts, payment methods, ZiG rate, settings and audit trail"
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={['px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === i ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'].join(' ')}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Staff Accounts ─────────────────────────────────────────────────── */}
      {tab === 0 && (
        <>
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
            Two roles are available: <strong>Admin</strong> (full access) and <strong>Receptionist</strong> (payments, students, reports and academic view).
          </div>
          <Card>
            <CardHeader
              title="Staff Accounts"
              subtitle={`${users.length} user${users.length !== 1 ? 's' : ''} registered`}
              action={<Button size="sm" icon={faUserPlus} onClick={() => setShowReg(true)}>Add Staff</Button>}
            />
            <Table columns={USER_COLS} data={users} emptyMessage="No staff accounts found." />
          </Card>
        </>
      )}

      {/* ── Payment Methods ────────────────────────────────────────────────── */}
      {tab === 1 && <PaymentMethodsPanel />}

      {/* ── ZiG Exchange Rate ──────────────────────────────────────────────── */}
      {tab === 2 && <ZigRatePanel />}

      {/* ── System Settings ────────────────────────────────────────────────── */}
      {tab === 3 && <SettingsPanel />}

      {/* ── Audit Logs ─────────────────────────────────────────────────────── */}
      {tab === 4 && (
        <Card>
          <CardHeader title="Audit Logs" subtitle="All system actions recorded with full details" />

          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 items-end">
              <FormField label="Action">
                <Select
                  value={auditFilters.action}
                  onChange={(e) => handleAuditFilterChange('action', e.target.value)}
                  placeholder="All actions"
                  options={[{ value: '', label: 'All actions' }, ...auditActionOptions]}
                />
              </FormField>

              <FormField label="Entity">
                <Select
                  value={auditFilters.entityName}
                  onChange={(e) => handleAuditFilterChange('entityName', e.target.value)}
                  placeholder="All entities"
                  options={[{ value: '', label: 'All entities' }, ...auditEntityOptions]}
                />
              </FormField>

              <FormField label="From">
                <Input
                  type="date"
                  value={auditFilters.from}
                  onChange={(e) => handleAuditFilterChange('from', e.target.value)}
                />
              </FormField>

              <FormField label="To">
                <Input
                  type="date"
                  value={auditFilters.to}
                  onChange={(e) => handleAuditFilterChange('to', e.target.value)}
                />
              </FormField>

              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={clearAuditFilters} className="w-full">
                  Clear
                </Button>
              </div>
            </div>
          </div>

          <Table
            columns={AUDIT_COLS}
            data={auditData?.items ?? []}
            loading={auditLoading}
            emptyMessage="No audit log entries."
            onRowClick={(row) => setSelectedAudit(row)}
          />

          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center mt-4 text-sm text-slate-500">
            <span>
              Showing {auditData?.items?.length ?? 0} of {auditData?.totalCount ?? 0} records
            </span>

            <div className="flex items-center gap-3 flex-wrap justify-end">
              <label className="flex items-center gap-2">
                <span>Rows</span>
                <Select
                  value={auditPageSize}
                  onChange={(e) => {
                    setAuditPage(1);
                    setAuditPageSize(Number(e.target.value));
                  }}
                  placeholder=""
                  className="w-20"
                  options={[{ value: 10, label: '10' }, { value: 20, label: '20' }, { value: 30, label: '30' }, { value: 50, label: '50' }]}
                />
              </label>

              <Button size="xs" variant="secondary" disabled={auditPage <= 1} onClick={() => setAuditPage((p) => Math.max(1, p - 1))}>
                Prev
              </Button>
              <span className="text-xs font-medium text-slate-600">
                Page {auditData?.page ?? auditPage} / {auditData?.totalPages ?? 1}
              </span>
              <Button
                size="xs"
                variant="secondary"
                disabled={(auditData?.page ?? auditPage) >= (auditData?.totalPages ?? 1)}
                onClick={() => setAuditPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Register Staff Modal ────────────────────────────────────────────── */}
      <Modal
        isOpen={!!selectedAudit}
        onClose={() => setSelectedAudit(null)}
        title="Audit Log Details"
        size="xl"
      >
        {selectedAudit && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">User</p>
                <p className="font-medium text-slate-800">{selectedAudit.userName || 'System'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Time</p>
                <p className="font-medium text-slate-800">{formatDateTime(selectedAudit.timestamp)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Action</p>
                <code className="text-xs bg-white border border-slate-200 px-2 py-1 rounded text-slate-700">{selectedAudit.action}</code>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Result</p>
                <Badge variant={selectedAudit.success !== false ? 'green' : 'red'}>
                  {selectedAudit.success !== false ? 'Succeeded' : 'Failed'}
                </Badge>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Entity</p>
                <p className="font-medium text-slate-800">{selectedAudit.entityName || '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Entity ID</p>
                <p className="font-medium text-slate-800">{selectedAudit.entityId || '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">IP Address</p>
                <p className="font-medium text-slate-800">{selectedAudit.ipAddress || '—'}</p>
              </div>
            </div>

            {selectedAudit.errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-xs uppercase tracking-wide text-red-600 mb-1">Error</p>
                <p className="text-sm text-red-700">{selectedAudit.errorMessage}</p>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Old Values</p>
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-xs text-slate-700 font-mono">
                  {formatAuditJson(selectedAudit.oldValues)}
                </pre>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">New Values</p>
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-xs text-slate-700 font-mono">
                  {formatAuditJson(selectedAudit.newValues)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showReg}
        onClose={() => { setShowReg(false); setRegForm(EMPTY_REG); setRegErr({}); }}
        title="Add Staff Member"
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setShowReg(false)}>Cancel</Button>
            <Button onClick={handleRegister} loading={saving} icon={faUserPlus}>Register</Button>
          </div>
        }
      >
        <form onSubmit={handleRegister} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name" error={regErr.firstName} required>
              <Input value={regForm.firstName} onChange={setReg('firstName')} error={regErr.firstName} />
            </FormField>
            <FormField label="Last Name" error={regErr.lastName} required>
              <Input value={regForm.lastName} onChange={setReg('lastName')} error={regErr.lastName} />
            </FormField>
          </div>
          <FormField label="Email" error={regErr.email} required>
            <Input type="email" value={regForm.email} onChange={setReg('email')} error={regErr.email} />
          </FormField>
          <FormField label="Role" error={regErr.role} required>
            <Select options={ROLE_OPTIONS} value={regForm.role} onChange={setReg('role')} error={regErr.role} placeholder="Select role" />
          </FormField>
          <FormField label="Temporary Password" error={regErr.password} required
            hint="User must change this on first login.">
            <Input type="password" value={regForm.password} onChange={setReg('password')} error={regErr.password} />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
