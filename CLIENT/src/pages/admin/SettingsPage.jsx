import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding, faReceipt, faImage,
  faSave, faUpload, faTrash, faEye,
} from '@fortawesome/free-solid-svg-icons';
import { useAppDispatch, useAppSelector, useToast } from '../../hooks';
import {
  fetchSettings, saveSetting, setLocalSetting,
  selectSettings, selectSettingsSaving,
} from '../../store/slices/settingsSlice';
import { SectionHeader, Card, CardHeader } from '../../components/ui/Card';
import { Input, FormField, Textarea } from '../../components/forms/FormControls';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';

// ─── Logo uploader ────────────────────────────────────────────────────────────
function LogoUploader({ label, settingKey, value, onChange }) {
  const inputRef = useRef(null);

  const pick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onChange(settingKey, ev.target.result); // base64 data URL
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-4">
      {/* Preview */}
      <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 flex-shrink-0">
        {value
          ? <img src={value} alt={label} className="w-full h-full object-contain p-1" />
          : <FontAwesomeIcon icon={faImage} className="text-slate-300 text-2xl" />
        }
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <div className="flex gap-2">
          <input ref={inputRef} type="file" accept="image/*" onChange={pick} className="hidden" />
          <Button size="xs" variant="secondary" icon={faUpload}
            onClick={() => inputRef.current?.click()}>
            Upload
          </Button>
          {value && (
            <Button size="xs" variant="ghost" icon={faTrash}
              onClick={() => onChange(settingKey, '')}>
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-slate-400">PNG or JPG, shown on receipt</p>
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, subtitle, icon, children }) {
  return (
    <Card>
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
          <FontAwesomeIcon icon={icon} className="text-blue-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

// ─── Receipt live preview strip ───────────────────────────────────────────────
function ReceiptPreviewStrip({ settings }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #1e3a8a',
        borderRadius: 8,
        padding: '10px 14px',
        fontFamily: 'Arial, Helvetica, sans-serif',
        color: '#1e3a8a',
        maxWidth: 400,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'baseline', marginBottom: 2 }}>
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 2 }}>RECEIPT</span>
          <span style={{ fontSize: 14, fontWeight: 900, color: '#dc2626', fontFamily: 'monospace', letterSpacing: 3 }}>XXXXX</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>
          {settings?.schoolName || 'SCHOOL NAME'}
        </div>
        <div style={{ fontSize: 7.5, fontWeight: 700, marginTop: 1 }}>
          {settings?.schoolMotto || 'School Motto'}
        </div>
        <div style={{ fontSize: 7, marginTop: 1 }}>
          {settings?.schoolAddress || 'School Address'}
        </div>
        <div style={{ fontSize: 7 }}>
          {settings?.schoolCity || 'City'}, Cell: {settings?.schoolPhone || '000 000 000'}
        </div>
      </div>
      <div style={{ borderTop: '2px solid #1e3a8a', borderBottom: '1px solid #1e3a8a', margin: '6px 0 4px' }} />
      <div style={{ fontSize: 8, textAlign: 'center', fontStyle: 'italic', fontWeight: 600, marginTop: 4 }}>
        {settings?.receiptFooter || 'With Thanks'}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const toast    = useToast();
  const settings = useAppSelector(selectSettings);
  const saving   = useAppSelector(selectSettingsSaving);

  // Local form state mirrors Redux settings
  const [form, setForm] = useState({});
  const [dirty, setDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => { dispatch(fetchSettings()); }, [dispatch]);
  useEffect(() => {
  dispatch(fetchSettings());
}, [dispatch]);


  const set = (k) => (e) => {
    const val = e.target.value;
    setForm(f => ({ ...f, [k]: val }));
    dispatch(setLocalSetting({ key: k, value: val })); // optimistic update
    setDirty(true);
  };

  const setLogoField = (k, val) => {
    setForm(f => ({ ...f, [k]: val }));
    dispatch(setLocalSetting({ key: k, value: val }));
    setDirty(true);
  };

  const handleSave = async () => {
    // Save each changed key separately
    const keys = Object.keys(form);
    let allOk  = true;
    for (const key of keys) {
      if (form[key] !== settings?.[key]) {
        const res = await dispatch(saveSetting({ key, value: form[key] }));
        if (!saveSetting.fulfilled.match(res)) { allOk = false; }
      }
    }
    if (allOk) { toast.success('Settings saved.'); setDirty(false); }
    else        toast.error('Some settings failed to save.');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <SectionHeader
          title="Settings"
          subtitle="Configure school information and receipt layout"
        />
        <div className="flex gap-2 mb-6">
          <Button size="sm" variant="secondary" icon={faEye}
            onClick={() => setShowPreview(v => !v)}>
            {showPreview ? 'Hide' : 'Preview'} Receipt
          </Button>
          <Button size="sm" icon={faSave} loading={saving}
            onClick={handleSave} disabled={!dirty}>
            Save Changes
          </Button>
        </div>
      </div>

      {dirty && (
        <Alert variant="warning" dismissible>
          You have unsaved changes. Click <strong>Save Changes</strong> to persist them.
        </Alert>
      )}

      {/* Receipt live preview */}
      {showPreview && (
        <Card>
          <CardHeader title="Receipt Header Preview" subtitle="How the receipt header will look when printed" />
          <ReceiptPreviewStrip settings={form} />
        </Card>
      )}

      {/* ── School Information ── */}
      <Section title="School Information" subtitle="Shown on all printed receipts" icon={faBuilding}>
        <FormField label="School Name" hint="Displayed as large heading on receipt">
          <Input value={form.schoolName ?? ''} onChange={set('schoolName')} placeholder="e.g. ROCK OUT COLLEGE" />
        </FormField>

        <FormField label="School Motto" hint="Shown below the school name">
          <Input value={form.schoolMotto ?? ''} onChange={set('schoolMotto')} placeholder="e.g. Patience, Perseverance & Prosperity" />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Street Address">
            <Input value={form.schoolAddress ?? ''} onChange={set('schoolAddress')} placeholder="Stand No. 5932 Stoneridge Phase 1" />
          </FormField>
          <FormField label="City">
            <Input value={form.schoolCity ?? ''} onChange={set('schoolCity')} placeholder="Waterfalls, Harare" />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Phone Number">
            <Input value={form.schoolPhone ?? ''} onChange={set('schoolPhone')} placeholder="0774 065 625" />
          </FormField>
          <FormField label="Email">
            <Input type="email" value={form.schoolEmail ?? ''} onChange={set('schoolEmail')} placeholder="info@school.ac.zw" />
          </FormField>
        </div>
      </Section>

      {/* ── Receipt Configuration ── */}
      <Section title="Receipt Configuration" subtitle="Text and fee labels on the printed receipt" icon={faReceipt}>
        <FormField label="Receipt Footer Text" hint="Printed at the bottom of every receipt">
          <Input value={form.receiptFooter ?? ''} onChange={set('receiptFooter')} placeholder="With Thanks" />
        </FormField>

        <FormField label="Default Currency">
          <select
            value={form.currency ?? 'USD'}
            onChange={set('currency')}
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="USD">USD — US Dollar</option>
            <option value="ZIG">ZIG — Zimbabwe Gold</option>
            <option value="ZWL">ZWL — Zimbabwe Dollar</option>
          </select>
        </FormField>

        <Alert variant="info">
          Fee breakdown labels on the receipt (Building Levy, Sports, GPF, Tuition Fee,
          Report Book, Others) are auto-mapped from payment fee types.
          Ensure your fee type names in Academic → Term Fees include these keywords.
        </Alert>
      </Section>

      {/* ── Logos ── */}
      <Section title="Receipt Logos" subtitle="Images shown top-left and top-right of the receipt" icon={faImage}>
        <div className="space-y-5">
          <LogoUploader
            label="Left Logo (e.g. Zimbabwe Coat of Arms)"
            settingKey="schoolLogoLeft"
            value={form.schoolLogoLeft ?? ''}
            onChange={setLogoField}
          />
          <LogoUploader
            label="Right Logo (e.g. School Crest)"
            settingKey="schoolLogo"
            value={form.schoolLogo ?? ''}
            onChange={setLogoField}
          />
        </div>
      </Section>

      {/* Sticky save bar */}
      {dirty && (
        <div className="sticky bottom-4 flex justify-end">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 px-4 py-3 flex items-center gap-3">
            <p className="text-sm text-slate-600">You have unsaved changes.</p>
            <Button icon={faSave} loading={saving} onClick={handleSave} size="sm">
              Save Settings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
