import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const PILL_WRAPPER  = 'flex gap-1 bg-slate-100 rounded-xl p-1';
const PILL_ACTIVE   = 'bg-white shadow-sm text-slate-800';
const PILL_INACTIVE = 'text-slate-500 hover:text-slate-700';

const UNDERLINE_WRAPPER  = 'flex border-b border-slate-200';
const UNDERLINE_ACTIVE   = 'border-b-2 border-blue-500 text-blue-600 -mb-px';
const UNDERLINE_INACTIVE = 'text-slate-500 hover:text-slate-700 border-b-2 border-transparent -mb-px';

const BOXED_WRAPPER  = 'flex gap-0 border border-slate-200 rounded-xl overflow-hidden';
const BOXED_ACTIVE   = 'bg-blue-600 text-white';
const BOXED_INACTIVE = 'bg-white text-slate-600 hover:bg-slate-50';

const VARIANTS = {
  pill:      { wrapper: PILL_WRAPPER,      active: PILL_ACTIVE,      inactive: PILL_INACTIVE      },
  underline: { wrapper: UNDERLINE_WRAPPER, active: UNDERLINE_ACTIVE, inactive: UNDERLINE_INACTIVE },
  boxed:     { wrapper: BOXED_WRAPPER,     active: BOXED_ACTIVE,     inactive: BOXED_INACTIVE     },
};

export default function Tabs({
  tabs      = [],
  active,
  onChange,
  variant   = 'pill',
  className = '',
  size      = 'sm',   // 'xs' | 'sm' | 'md'
}) {
  const v = VARIANTS[variant] ?? VARIANTS.pill;

  const sizeClass = {
    xs: 'px-2.5 py-1   text-xs',
    sm: 'px-4   py-2   text-sm',
    md: 'px-5   py-2.5 text-base',
  }[size] ?? 'px-4 py-2 text-sm';

  return (
    <div className={`${v.wrapper} w-fit flex-wrap ${className}`} role="tablist">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange?.(t.key)}
            className={[
              'inline-flex items-center gap-2 rounded-lg font-medium transition-all duration-150 whitespace-nowrap',
              sizeClass,
              isActive ? v.active : v.inactive,
            ].join(' ')}
          >
            {t.icon && <FontAwesomeIcon icon={t.icon} className="text-xs" />}
            {t.label}
            {t.count !== undefined && (
              <span className={[
                'inline-flex items-center justify-center rounded-full text-xs px-1.5 py-0.5 min-w-[18px] font-semibold',
                isActive ? 'bg-white/20 text-inherit' : 'bg-slate-200 text-slate-600',
              ].join(' ')}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
