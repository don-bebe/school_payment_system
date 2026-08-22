import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { formatCurrency } from '../../utils/formatters';

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', padding = 'p-5' }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${padding} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0 ml-4">{action}</div>}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
/**
 * Used on the dashboard for key metrics.
 * Props:
 *   title      – metric label
 *   value      – main display value (string or number)
 *   currency   – if set, formats value with formatCurrency
 *   icon       – FontAwesome icon
 *   iconColor  – Tailwind text colour class for the icon wrapper
 *   iconBg     – Tailwind bg colour class for the icon wrapper
 *   trend      – number (positive = green, negative = red)
 *   trendLabel – text beside the trend arrow
 */
export function StatCard({
  title,
  value,
  currency,
  icon,
  iconColor = 'text-blue-600',
  iconBg    = 'bg-blue-50',
  trend,
  trendLabel,
  className = '',
}) {
  const displayValue = currency
    ? formatCurrency(value, currency)
    : value;

  const trendPositive = trend > 0;

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        {icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
            <FontAwesomeIcon icon={icon} className={`text-lg ${iconColor}`} />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 mb-1">{displayValue}</p>
      {trend !== undefined && (
        <p className={`text-xs font-medium ${trendPositive ? 'text-emerald-600' : 'text-red-500'}`}>
          {trendPositive ? '▲' : '▼'} {Math.abs(trend)}%
          {trendLabel && <span className="text-slate-400 font-normal ml-1">{trendLabel}</span>}
        </p>
      )}
    </div>
  );
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────
export function ProgressBar({ value = 0, max = 100, label, showPercent = true, color = 'bg-blue-500' }) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(100, Math.round((value / safeMax) * 100)) || 0;
  return (
    <div>
      {(label || showPercent) && (
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          {label && <span>{label}</span>}
          {showPercent && <span>{pct}%</span>}
        </div>
      )}
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── SectionHeader ───────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────
export function Divider({ label, className = '' }) {
  if (label) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400 font-medium">{label}</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
    );
  }
  return <hr className={`border-slate-200 ${className}`} />;
}