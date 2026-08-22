export function Checkbox({
  label,
  checked,
  onChange,
  disabled    = false,
  error,
  description,
  className   = '',
  id,
}) {
  const inputId = id ?? `chk-${label?.replace(/\s/g, '-').toLowerCase()}`;
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className="flex items-center h-5 mt-0.5">
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={[
            'w-4 h-4 rounded border-slate-300 text-blue-600',
            'focus:ring-2 focus:ring-blue-200 focus:ring-offset-0',
            'transition-colors cursor-pointer',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
            error ? 'border-red-400' : '',
          ].join(' ')}
        />
      </div>
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <label htmlFor={inputId} className={`text-sm font-medium cursor-pointer ${disabled ? 'text-slate-400' : 'text-slate-700'}`}>
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-slate-400 mt-0.5">{description}</p>
          )}
          {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
/**
 * Usage:
 *   <Toggle
 *     label="Active"
 *     checked={student.isActive}
 *     onChange={val => handleToggle(val)}
 *   />
 */
export function Toggle({
  label,
  checked,
  onChange,
  disabled    = false,
  size        = 'md',  // 'sm' | 'md'
  labelLeft   = false,
  description,
  className   = '',
}) {
  const TRACK = {
    sm: 'w-8  h-4',
    md: 'w-11 h-6',
  }[size] ?? 'w-11 h-6';

  const THUMB = {
    sm: `w-3  h-3  ${checked ? 'translate-x-4' : 'translate-x-0.5'}`,
    md: `w-5  h-5  ${checked ? 'translate-x-5' : 'translate-x-0.5'}`,
  }[size] ?? `w-5 h-5 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`;

  const handleClick = () => {
    if (!disabled) onChange?.(!checked);
  };

  const track = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={handleClick}
      disabled={disabled}
      className={[
        TRACK,
        'relative inline-flex items-center rounded-full transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-1',
        checked  ? 'bg-blue-600'   : 'bg-slate-300',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block rounded-full bg-white shadow-sm transition-transform duration-200',
          THUMB,
        ].join(' ')}
      />
    </button>
  );

  if (!label && !description) return track;

  return (
    <div className={`flex items-center gap-3 ${labelLeft ? 'flex-row-reverse justify-end' : ''} ${className}`}>
      {track}
      <div>
        {label && <p className={`text-sm font-medium ${disabled ? 'text-slate-400' : 'text-slate-700'}`}>{label}</p>}
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
    </div>
  );
}
