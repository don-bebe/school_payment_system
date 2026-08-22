import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

// ─── Spinner ──────────────────────────────────────────────────────────────────
const SIZES = { xs: 'text-sm', sm: 'text-base', md: 'text-xl', lg: 'text-3xl', xl: 'text-5xl' };

export function Spinner({ size = 'md', className = '' }) {
  return (
    <FontAwesomeIcon
      icon={faSpinner}
      className={`animate-spin text-blue-500 ${SIZES[size]} ${className}`}
    />
  );
}

// ─── Page-level full screen loader ───────────────────────────────────────────
export function PageLoader({ message = 'Loading…' }) {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center gap-4">
      <Spinner size="xl" />
      <p className="text-slate-500 text-sm font-medium">{message}</p>
    </div>
  );
}

// ─── Inline loading state ─────────────────────────────────────────────────────
export function LoadingOverlay({ loading, children }) {
  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-xl">
          <Spinner size="lg" />
        </div>
      )}
      {children}
    </div>
  );
}

// ─── Skeleton block ───────────────────────────────────────────────────────────
export function Skeleton({ className = '', height = 'h-4', width = 'w-full' }) {
  return (
    <div className={`animate-pulse bg-slate-100 rounded ${height} ${width} ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 bg-slate-100 rounded w-1/3" />
        <div className="h-8 w-8 bg-slate-100 rounded-lg" />
      </div>
      <div className="h-7 bg-slate-100 rounded w-1/2" />
      <div className="h-3 bg-slate-100 rounded w-2/3" />
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────
// EmptyState uses the same FontAwesomeIcon import from above
import { faInbox } from '@fortawesome/free-solid-svg-icons';

export function EmptyState({
  icon    = faInbox,
  title   = 'Nothing here',
  message = 'No records found.',
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <FontAwesomeIcon icon={icon} className="text-3xl text-slate-300" />
      </div>
      <h3 className="text-base font-semibold text-slate-700 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-xs">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Error banner ─────────────────────────────────────────────────────────────
export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-center gap-3 text-sm text-red-700">
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-red-600 underline hover:no-underline font-medium flex-shrink-0"
        >
          Retry
        </button>
      )}
    </div>
  );
}
