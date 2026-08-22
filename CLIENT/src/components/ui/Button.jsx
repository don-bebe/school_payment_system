import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

const BASE = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

const VARIANTS = {
  primary:   'bg-blue-600  hover:bg-blue-700  active:bg-blue-800  text-white  focus:ring-blue-500',
  secondary: 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 focus:ring-slate-400',
  danger:    'bg-red-600   hover:bg-red-700   active:bg-red-800   text-white  focus:ring-red-500',
  success:   'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500',
  ghost:     'bg-transparent hover:bg-slate-100 text-slate-700 focus:ring-slate-400',
  outline:   'border border-slate-300 hover:bg-slate-50 text-slate-700 focus:ring-slate-400',
};

const SIZES = {
  xs:  'px-2.5 py-1   text-xs  h-7',
  sm:  'px-3   py-1.5 text-sm  h-8',
  md:  'px-4   py-2   text-sm  h-9',
  lg:  'px-5   py-2.5 text-base h-11',
  xl:  'px-6   py-3   text-base h-12',
};

export default function Button({
  children,
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  disabled  = false,
  icon,
  iconRight,
  fullWidth = false,
  className = '',
  type      = 'button',
  onClick,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={[
        BASE,
        VARIANTS[variant] ?? VARIANTS.primary,
        SIZES[size]       ?? SIZES.md,
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading
        ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
        : icon && <FontAwesomeIcon icon={icon} />}

      {children}

      {!loading && iconRight && <FontAwesomeIcon icon={iconRight} />}
    </button>
  );
}
