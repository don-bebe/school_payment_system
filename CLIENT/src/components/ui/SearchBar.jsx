import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faXmark, faFilter } from '@fortawesome/free-solid-svg-icons';
import { useDebounce } from '../../hooks';

export function SearchBar({ onSearch, placeholder = 'Search…', defaultValue = '' }) {
  const [value, setValue] = useState(defaultValue);
  const debounced = useDebounce(value, 400);

  // Trigger search whenever the debounced value changes
  useEffect(() => { onSearch?.(debounced); }, [debounced]);

  const clear = () => {
    setValue('');
    onSearch?.('');
  };

  return (
    <div className="relative flex-1">
      <FontAwesomeIcon
        icon={faMagnifyingGlass}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white
                   focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-colors"
      />
      {value && (
        <button
          onClick={clear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <FontAwesomeIcon icon={faXmark} className="text-sm" />
        </button>
      )}
    </div>
  );
}

/**
 * FilterBar — a horizontal row of filter chips/selects.
 * Used for Grade, Year, Term filters above data tables.
 *
 * filters: [{ key, label, options: [{ value, label }] }]
 * values:  { [key]: value }
 * onChange: (key, value) => void
 */
export function FilterBar({ filters = [], values = {}, onChange, className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
        <FontAwesomeIcon icon={faFilter} />
        Filter
      </span>
      {filters.map((f) => (
        <select
          key={f.key}
          value={values[f.key] ?? ''}
          onChange={(e) => onChange?.(f.key, e.target.value || null)}
          className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white
                     focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400
                     text-slate-700 cursor-pointer"
        >
          <option value="">{f.label}</option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ))}
    </div>
  );
}

/**
 * DateRangePicker — simple from/to date inputs side by side.
 */
export function DateRangePicker({ from, to, onFromChange, onToChange, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input
        type="date"
        value={from}
        onChange={(e) => onFromChange?.(e.target.value)}
        className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white
                   focus:outline-none focus:ring-2 focus:ring-blue-200 text-slate-700"
      />
      <span className="text-slate-400 text-xs">to</span>
      <input
        type="date"
        value={to}
        min={from}
        onChange={(e) => onToChange?.(e.target.value)}
        className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white
                   focus:outline-none focus:ring-2 focus:ring-blue-200 text-slate-700"
      />
    </div>
  );
}
