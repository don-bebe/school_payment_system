import { useState, useEffect } from 'react';
import logo from '/logo.png';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {  faEnvelope, faLock, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { login, selectAuthLoading, selectAuthError, clearError } from '../../store/slices/authSlice';
import { validateLoginForm } from '../../utils/validators';
import { ROUTES } from '../../utils/constants';
import Button from '../../components/ui/Button';
import { Input, FormField } from '../../components/forms/FormControls';

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const loading  = useAppSelector(selectAuthLoading);
  const apiError = useAppSelector(selectAuthError);

  const [form, setForm]       = useState({ email: '', password: '' });
  const [errors, setErrors]   = useState({});
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => { dispatch(clearError()); }, [dispatch]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

const handleSubmit = async (e) => {
  e.preventDefault();
  const errs = validateLoginForm(form);
  if (Object.values(errs).some(Boolean)) { setErrors(errs); return; }
  setErrors({});
  const res = await dispatch(login(form));
  if (login.fulfilled.match(res)) {
    // Wait a tick so the Redux persist flush and localStorage write complete
    // before the dashboard mounts and fires its API calls
    await new Promise(resolve => setTimeout(resolve, 0));
    navigate(ROUTES.DASHBOARD);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 border border-white/20 shadow-lg shadow-blue-900/40 mb-4 p-1">
            <img
              src={logo}
              alt="Rock Out College"
              className="w-full h-full object-contain"
              onError={e => { e.target.style.display='none'; }}
            />
          </div>
          <h1 className="text-2xl font-bold text-white">Rock Out College</h1>
          <p className="text-blue-300 text-sm mt-1 font-medium">School Fees Management System</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">Sign in to your account</h2>

          {apiError && (
            <div className="mb-4 px-4 py-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <FormField label={<span className="text-slate-300">Email</span>} error={errors.email} required>
              <div className="relative">
                <FontAwesomeIcon icon={faEnvelope} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <Input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="admin@school.ac.zw"
                  error={errors.email}
                  className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-400 focus:ring-blue-500/30"
                  autoComplete="email"
                />
              </div>
            </FormField>

            <FormField label={<span className="text-slate-300">Password</span>} error={errors.password} required>
              <div className="relative">
                <FontAwesomeIcon icon={faLock} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <Input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="••••••••"
                  error={errors.password}
                  className="pl-9 pr-10 bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-400 focus:ring-blue-500/30"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  <FontAwesomeIcon icon={showPwd ? faEyeSlash : faEye} className="text-sm" />
                </button>
              </div>
            </FormField>

            <Button
              type="submit"
              loading={loading}
              fullWidth
              size="lg"
              className="mt-2 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/40"
            >
              Sign In
            </Button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-6">
            Contact your administrator to reset your password.
          </p>
        </div>
      </div>
    </div>
  );
}
