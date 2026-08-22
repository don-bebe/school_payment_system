import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export function InfoRow({
  label,
  value,
  labelClass = '',
  valueClass = '',
  border     = true,
  className  = '',
}) {
  return (
    <div className={[
      'flex items-center justify-between py-2.5 text-sm',
      border ? 'border-b border-slate-50 last:border-0' : '',
      className,
    ].join(' ')}>
      <span className={`text-slate-500 font-medium shrink-0 ${labelClass}`}>{label}</span>
      <span className={`text-slate-800 text-right ml-4 ${valueClass}`}>{value ?? '—'}</span>
    </div>
  );
}

export function KeyValueList({ title, rows = [], className = '' }) {
  return (
    <div className={className}>
      {title && (
        <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-2 mt-1">
          {title}
        </p>
      )}
      <div>
        {rows.map(({ label, value, valueClass }) => (
          <InfoRow key={label} label={label} value={value} valueClass={valueClass} />
        ))}
      </div>
    </div>
  );
}

export function DetailGrid({ fields = [], className = '' }) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      {fields.map(({ label, value, span = 1 }) => (
        <div
          key={label}
          className={[
            'bg-slate-50 rounded-xl px-4 py-3',
            span === 2 ? 'col-span-2' : '',
          ].join(' ')}
        >
          <p className="text-xs text-slate-400 font-medium mb-0.5">{label}</p>
          <p className="text-sm font-semibold text-slate-800 break-words">{value ?? '—'}</p>
        </div>
      ))}
    </div>
  );
}

const BANNER_STYLES = {
  red:   'bg-red-50     border-red-200     text-red-700',
  green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  amber: 'bg-amber-50   border-amber-200   text-amber-700',
  blue:  'bg-blue-50    border-blue-200    text-blue-700',
  slate: 'bg-slate-50   border-slate-200   text-slate-700',
};

export function SummaryBanner({ label, value, variant = 'slate', icon, className = '' }) {
  return (
    <div className={[
      'flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium',
      BANNER_STYLES[variant] ?? BANNER_STYLES.slate,
      className,
    ].join(' ')}>
      <span className="flex items-center gap-2">
        {icon && <FontAwesomeIcon icon={icon} className="text-xs opacity-70" />}
        {label}
      </span>
      <span className="font-bold text-base">{value}</span>
    </div>
  );
}
