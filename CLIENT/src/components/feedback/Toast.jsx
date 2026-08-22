import { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle, faExclamationCircle,
  faInfoCircle, faExclamationTriangle, faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { removeToast, selectToasts } from '../../store/slices/uiSlice';

const TOAST_STYLES = {
  success: {
    bar:  'border-l-4 border-emerald-500 bg-white',
    icon: faCheckCircle,
    ic:   'text-emerald-500',
    text: 'text-emerald-800',
  },
  error: {
    bar:  'border-l-4 border-red-500 bg-white',
    icon: faExclamationCircle,
    ic:   'text-red-500',
    text: 'text-red-800',
  },
  warning: {
    bar:  'border-l-4 border-amber-500 bg-white',
    icon: faExclamationTriangle,
    ic:   'text-amber-500',
    text: 'text-amber-800',
  },
  info: {
    bar:  'border-l-4 border-blue-500 bg-white',
    icon: faInfoCircle,
    ic:   'text-blue-500',
    text: 'text-blue-800',
  },
};

function ToastItem({ toast }) {
  const dispatch = useAppDispatch();
  const style    = TOAST_STYLES[toast.type] ?? TOAST_STYLES.info;

  useEffect(() => {
    const t = setTimeout(() => dispatch(removeToast(toast.id)), toast.duration ?? 4000);
    return () => clearTimeout(t);
  }, [toast.id, toast.duration, dispatch]);

  return (
    <div
      className={[
        'flex items-start gap-3 rounded-xl shadow-lg px-4 py-3 min-w-[280px] max-w-sm',
        'animate-[slideIn_0.2s_ease-out]',
        style.bar,
      ].join(' ')}
      role="alert"
    >
      <FontAwesomeIcon icon={style.icon} className={`mt-0.5 text-lg flex-shrink-0 ${style.ic}`} />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className={`text-sm font-semibold ${style.text}`}>{toast.title}</p>
        )}
        {toast.message && (
          <p className="text-sm text-slate-600 mt-0.5">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => dispatch(removeToast(toast.id))}
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors mt-0.5"
      >
        <FontAwesomeIcon icon={faTimes} className="text-xs" />
      </button>
    </div>
  );
}

/**
 * Render this once in App.jsx — it reads the toast queue from Redux.
 * <ToastContainer />
 */
export default function ToastContainer() {
  const toasts = useAppSelector(selectToasts);

  return (
    <div
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  );
}
