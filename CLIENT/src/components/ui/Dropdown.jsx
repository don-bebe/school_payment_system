import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faEllipsisVertical } from '@fortawesome/free-solid-svg-icons';

export default function Dropdown({
  label   = 'Actions',
  items   = [],
  trigger,        // custom trigger node
  triggerVariant = 'secondary', // matches Button variants (visual only here)
  align   = 'right',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const ref  = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const TRIGGER_BASE = 'inline-flex items-center gap-1.5 font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 select-none text-sm px-3 py-1.5';

  const TRIGGER_STYLES = {
    primary:   'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 focus:ring-slate-300',
    ghost:     'hover:bg-slate-100 text-slate-600 focus:ring-slate-300',
    outline:   'border border-slate-300 hover:bg-slate-50 text-slate-700 focus:ring-slate-300',
  };

  const defaultTrigger = (
    <button
      onClick={() => setOpen(o => !o)}
      className={[TRIGGER_BASE, TRIGGER_STYLES[triggerVariant] ?? TRIGGER_STYLES.secondary].join(' ')}
    >
      {label}
      <FontAwesomeIcon icon={faChevronDown} className={`text-xs transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
  );

  const iconTrigger = (
    <button
      onClick={() => setOpen(o => !o)}
      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors focus:outline-none"
    >
      <FontAwesomeIcon icon={faEllipsisVertical} />
    </button>
  );

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      {/* Trigger */}
      <div onClick={() => setOpen(o => !o)}>
        {trigger ?? (label === '...' ? iconTrigger : defaultTrigger)}
      </div>

      {/* Menu */}
      {open && (
        <div
          className={[
            'absolute z-50 mt-1.5 min-w-[160px] bg-white rounded-xl shadow-xl border border-slate-200',
            'py-1 overflow-hidden',
            align === 'left' ? 'left-0' : 'right-0',
          ].join(' ')}
        >
          {items.map((item, i) => {
            if (item.separator) {
              return <div key={i} className="h-px bg-slate-100 my-1" />;
            }
            return (
              <button
                key={i}
                disabled={item.disabled}
                onClick={() => { item.onClick?.(); setOpen(false); }}
                className={[
                  'w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left transition-colors',
                  item.danger
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-slate-700 hover:bg-slate-50',
                  item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                ].join(' ')}
              >
                {item.icon && (
                  <FontAwesomeIcon
                    icon={item.icon}
                    className={`text-xs flex-shrink-0 ${item.danger ? 'text-red-500' : 'text-slate-400'}`}
                  />
                )}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * ActionMenu — shorthand for a three-dot icon trigger dropdown.
 * Identical to <Dropdown trigger="..." /> but even shorter to use in table rows.
 *
 * Usage:
 *   <ActionMenu items={[{ label: 'Edit', icon: faPen, onClick: handleEdit }]} />
 */
export function ActionMenu({ items = [], align = 'right' }) {
  return (
    <Dropdown
      trigger={
        <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <FontAwesomeIcon icon={faEllipsisVertical} />
        </button>
      }
      items={items}
      align={align}
    />
  );
}
