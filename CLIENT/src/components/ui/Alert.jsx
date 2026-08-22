import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleInfo, faCircleCheck,
  faTriangleExclamation, faCircleXmark,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';


const STYLES = {
  info: {
    wrapper: 'bg-blue-50   border-blue-200   text-blue-800',
    icon:    faCircleInfo,
    ic:      'text-blue-400',
  },
  success: {
    wrapper: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    icon:    faCircleCheck,
    ic:      'text-emerald-500',
  },
  warning: {
    wrapper: 'bg-amber-50  border-amber-200  text-amber-800',
    icon:    faTriangleExclamation,
    ic:      'text-amber-500',
  },
  error: {
    wrapper: 'bg-red-50    border-red-200    text-red-800',
    icon:    faCircleXmark,
    ic:      'text-red-400',
  },
};

export default function Alert({
  variant     = 'info',
  title,
  children,
  icon,
  dismissible = false,
  className   = '',
  onDismiss,
}) {
  const [visible, setVisible] = useState(true);
  const style = STYLES[variant] ?? STYLES.info;

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  return (
    <div
      role="alert"
      className={[
        'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
        style.wrapper,
        className,
      ].join(' ')}
    >
      <FontAwesomeIcon
        icon={icon ?? style.icon}
        className={`mt-0.5 flex-shrink-0 ${style.ic}`}
      />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        {children && <p className="leading-relaxed opacity-90">{children}</p>}
      </div>
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity ml-1 mt-0.5"
          aria-label="Dismiss"
        >
          <FontAwesomeIcon icon={faXmark} className="text-xs" />
        </button>
      )}
    </div>
  );
}
