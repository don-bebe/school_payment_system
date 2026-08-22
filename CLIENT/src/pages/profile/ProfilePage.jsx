import { useState, useRef, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLock, faShieldHalved, faEye, faEyeSlash, faCheck,
  faPenNib, faTrash, faUpload, faRotateLeft,
} from '@fortawesome/free-solid-svg-icons';
import { useAppDispatch, useAppSelector, useToast } from '../../hooks';
import {
  changePassword, saveSignature,
  selectCurrentUser, selectAuthLoading,
} from '../../store/slices/authSlice';
import { validatePassword, validatePasswordMatch } from '../../utils/validators';
import { SectionHeader, Card, CardHeader } from '../../components/ui/Card';
import { Avatar, RoleBadge } from '../../components/ui/Badge';
import { Input, FormField } from '../../components/forms/FormControls';
import Button from '../../components/ui/Button';

// ─── Password Change Form ─────────────────────────────────────────────────────
function PasswordForm() {
  const dispatch = useAppDispatch();
  const toast    = useToast();
  const loading  = useAppSelector(selectAuthLoading);

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [show, setShow]   = useState({ current: false, new: false, confirm: false });
  const [done, setDone]   = useState(false);

  const set    = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setDone(false); };
  const toggle = (k) => () => setShow(s => ({ ...s, [k]: !s[k] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {
      currentPassword: !form.currentPassword ? 'Current password is required.' : null,
      newPassword:     validatePassword(form.newPassword),
      confirmPassword: validatePasswordMatch(form.newPassword, form.confirmPassword),
    };
    if (Object.values(errs).some(Boolean)) { setErrors(errs); return; }
    setErrors({});

    const res = await dispatch(changePassword({
      currentPassword: form.currentPassword,
      newPassword:     form.newPassword,
    }));

    if (changePassword.fulfilled.match(res)) {
      toast.success('Password changed successfully.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setDone(true);
    } else {
      toast.error('Failed to change password. Check your current password.');
    }
  };

  const PWD_RULES = [
    { test: (p) => p.length >= 8,   label: 'At least 8 characters' },
    { test: (p) => /[A-Z]/.test(p), label: 'One uppercase letter'  },
    { test: (p) => /\d/.test(p),    label: 'One number'            },
  ];

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 max-w-sm">
      <FormField label="Current Password" error={errors.currentPassword} required>
        <div className="relative">
          <Input type={show.current ? 'text' : 'password'} value={form.currentPassword}
            onChange={set('currentPassword')} error={errors.currentPassword}
            autoComplete="current-password" className="pr-9" />
          <button type="button" onClick={toggle('current')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <FontAwesomeIcon icon={show.current ? faEyeSlash : faEye} className="text-sm" />
          </button>
        </div>
      </FormField>

      <FormField label="New Password" error={errors.newPassword} required>
        <div className="relative">
          <Input type={show.new ? 'text' : 'password'} value={form.newPassword}
            onChange={set('newPassword')} error={errors.newPassword}
            autoComplete="new-password" className="pr-9" />
          <button type="button" onClick={toggle('new')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <FontAwesomeIcon icon={show.new ? faEyeSlash : faEye} className="text-sm" />
          </button>
        </div>
        {form.newPassword && (
          <div className="mt-2 space-y-1">
            {PWD_RULES.map(({ test, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs">
                <span className={test(form.newPassword) ? 'text-emerald-500' : 'text-slate-300'}>
                  <FontAwesomeIcon icon={faCheck} />
                </span>
                <span className={test(form.newPassword) ? 'text-emerald-600' : 'text-slate-400'}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}
      </FormField>

      <FormField label="Confirm New Password" error={errors.confirmPassword} required>
        <div className="relative">
          <Input type={show.confirm ? 'text' : 'password'} value={form.confirmPassword}
            onChange={set('confirmPassword')} error={errors.confirmPassword}
            autoComplete="new-password" className="pr-9" />
          <button type="button" onClick={toggle('confirm')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <FontAwesomeIcon icon={show.confirm ? faEyeSlash : faEye} className="text-sm" />
          </button>
        </div>
      </FormField>

      {done && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
          <FontAwesomeIcon icon={faCheck} /> Password updated successfully.
        </div>
      )}

      <Button type="submit" loading={loading} icon={faLock}>Update Password</Button>
    </form>
  );
}

// ─── Signature Section ────────────────────────────────────────────────────────

function SignatureSection({ currentSignature }) {
  const dispatch  = useAppDispatch();
  const toast     = useToast();
  const loading   = useAppSelector(selectAuthLoading);

  const canvasRef    = useRef(null);
  const fileRef      = useRef(null);
  const [drawing,    setDrawing]    = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [preview,    setPreview]    = useState(currentSignature ?? null);
  const [mode,       setMode]       = useState('draw'); // 'draw' | 'upload'
  const lastPos      = useRef(null);

  // Keep preview in sync with prop (e.g. after initial load)
  useEffect(() => { setPreview(currentSignature ?? null); }, [currentSignature]);

  const getPos = (e, canvas) => {
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  };

  const startDraw = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDrawing(true);
    lastPos.current = getPos(e, canvas);
  }, []);

  const draw = useCallback((e) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx  = canvas.getContext('2d');
    const pos  = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.stroke();
    lastPos.current = pos;
    setHasDrawing(true);
  }, [drawing]);

  const endDraw = useCallback(() => setDrawing(false), []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    let dataUri = null;

    if (mode === 'draw') {
      if (!hasDrawing) { toast.error('Please draw your signature first.'); return; }
      dataUri = canvasRef.current?.toDataURL('image/png') ?? null;
    } else {
      if (!preview) { toast.error('Please upload a signature image first.'); return; }
      dataUri = preview;
    }

    const res = await dispatch(saveSignature(dataUri));
    if (saveSignature.fulfilled.match(res)) {
      toast.success('Signature saved — it will appear on receipts.');
      setPreview(dataUri);
      if (mode === 'draw') clearCanvas();
    } else {
      toast.error('Failed to save signature.');
    }
  };

  const handleClear = async () => {
    const res = await dispatch(saveSignature(null));
    if (saveSignature.fulfilled.match(res)) {
      toast.success('Signature removed.');
      setPreview(null);
      clearCanvas();
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Your signature appears in the "Received by" section of every receipt you issue.
      </p>

      {/* Current saved signature */}
      {preview && (
        <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-slate-500 mb-1 font-medium">Current signature</p>
            <img src={preview} alt="Signature" className="h-12 object-contain" />
          </div>
          <button type="button" onClick={handleClear}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
            <FontAwesomeIcon icon={faTrash} className="text-xs" /> Remove
          </button>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode('draw')}
          className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-all ${mode === 'draw' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
          <FontAwesomeIcon icon={faPenNib} className="mr-2" />Draw
        </button>
        <button type="button" onClick={() => setMode('upload')}
          className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-all ${mode === 'upload' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
          <FontAwesomeIcon icon={faUpload} className="mr-2" />Upload
        </button>
      </div>

      {mode === 'draw' ? (
        <div>
          <p className="text-xs text-slate-400 mb-1">Draw your signature below:</p>
          <div className="relative border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              width={400} height={100}
              className="w-full touch-none cursor-crosshair"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
            {!hasDrawing && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-xs text-slate-300 select-none">Sign here</p>
              </div>
            )}
          </div>
          {hasDrawing && (
            <button type="button" onClick={clearCanvas}
              className="mt-1 text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
              <FontAwesomeIcon icon={faRotateLeft} className="text-xs" /> Clear
            </button>
          )}
        </div>
      ) : (
        <div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-full py-6 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-all flex flex-col items-center gap-2">
            <FontAwesomeIcon icon={faUpload} />
            <span>Click to upload signature image</span>
            <span className="text-xs">PNG, JPG — transparent background works best</span>
          </button>
        </div>
      )}

      <Button onClick={handleSave} loading={loading} icon={faCheck}>
        Save Signature
      </Button>
    </div>
  );
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const user = useAppSelector(selectCurrentUser);
  const name = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();

  const INFO = [
    { label: 'Full Name', value: name },
    { label: 'Email',     value: user?.email ?? '—' },
    { label: 'Role',      value: user?.role  ?? '—', isRole: true },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <SectionHeader title="My Profile" subtitle="Account details, security settings, and receipt signature" />

      {/* Profile card */}
      <Card>
        <div className="flex items-center gap-5 mb-6 pb-6 border-b border-slate-100">
          <Avatar name={name} size="xl" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">{name}</h2>
            <p className="text-slate-500 text-sm">{user?.email}</p>
            <div className="mt-1.5"><RoleBadge role={user?.role} /></div>
          </div>
        </div>
        <CardHeader title="Account Information" subtitle="Your details as set by the administrator" />
        <dl className="space-y-4">
          {INFO.map(({ label, value, isRole }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <dt className="text-sm text-slate-500 font-medium">{label}</dt>
              <dd className="text-sm text-slate-800">{isRole ? <RoleBadge role={value} /> : value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* Signature */}
      <Card>
        <CardHeader
          title="Receipt Signature"
          subtitle="Appears on printed receipts in the 'Received by' section"
        />
        <SignatureSection currentSignature={user?.signatureImageBase64 ?? null} />
      </Card>

      {/* Security */}
      <Card>
        <CardHeader title="Security" subtitle="Change your login password" />
        <div className="flex items-start gap-3 mb-5 p-3 bg-amber-50 rounded-lg border border-amber-100">
          <FontAwesomeIcon icon={faShieldHalved} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            Use a strong password with at least 8 characters, one uppercase letter, and one number.
            Do not share your password with anyone.
          </p>
        </div>
        <PasswordForm />
      </Card>
    </div>
  );
}
