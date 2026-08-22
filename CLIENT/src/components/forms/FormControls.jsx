// ─── Shared style pieces ───────────────────────────────────────────────────────
const FIELD_BASE =
  'w-full rounded-lg border px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 ' +
  'focus:outline-none focus:ring-2 transition-colors duration-150 bg-white';
const FIELD_NORMAL = 'border-slate-300 focus:border-blue-500 focus:ring-blue-200';
const FIELD_ERROR  = 'border-red-400   focus:border-red-500  focus:ring-red-200';
const FIELD_DISABLED = 'bg-slate-50 text-slate-500 cursor-not-allowed';

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input({
  type      = 'text',
  error,
  disabled  = false,
  className = '',
  ...rest
}) {
  return (
    <input
      type={type}
      disabled={disabled}
      className={[
        FIELD_BASE,
        error    ? FIELD_ERROR   : FIELD_NORMAL,
        disabled ? FIELD_DISABLED : '',
        className,
      ].join(' ')}
      {...rest}
    />
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────
/**
 * options: [{ value, label }]
 * placeholder: string shown as first disabled option
 */
export function Select({
  options      = [],
  placeholder  = 'Select…',
  error,
  disabled     = false,
  className    = '',
  ...rest
}) {
  return (
    <select
      disabled={disabled}
      className={[
        FIELD_BASE,
        error    ? FIELD_ERROR   : FIELD_NORMAL,
        disabled ? FIELD_DISABLED : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────
export function Textarea({
  rows      = 3,
  error,
  disabled  = false,
  className = '',
  ...rest
}) {
  return (
    <textarea
      rows={rows}
      disabled={disabled}
      className={[
        FIELD_BASE,
        error    ? FIELD_ERROR   : FIELD_NORMAL,
        disabled ? FIELD_DISABLED : '',
        'resize-y',
        className,
      ].join(' ')}
      {...rest}
    />
  );
}

// ─── FormField wrapper ────────────────────────────────────────────────────────
/**
 * Wraps any form control with a label and an error message.
 *
 * Usage:
 *   <FormField label="First Name" error={errors.firstName} required>
 *     <Input value={...} onChange={...} error={errors.firstName} />
 *   </FormField>
 */
export function FormField({
  label,
  error,
  hint,
  required  = false,
  className = '',
  children,
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint  && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
