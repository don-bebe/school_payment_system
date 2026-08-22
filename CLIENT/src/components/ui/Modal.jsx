import { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import Button from './Button';

const SIZE_CLASSES = {
  sm:   'max-w-md',
  md:   'max-w-lg',
  lg:   'max-w-2xl',
  xl:   'max-w-4xl',
  full: 'max-w-[95vw]',
};

/**
 * Modal component.
 *
 * Props:
 *   isOpen    – controls visibility
 *   onClose   – called when clicking backdrop or close button
 *   title     – modal heading
 *   size      – 'sm' | 'md' | 'lg' | 'xl' | 'full'
 *   footer    – custom footer node (override default action area)
 *   onConfirm – if provided, shows a default OK button
 *   confirmLabel, confirmVariant
 *   loading   – disables confirm button and shows spinner
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  size         = 'md',
  children,
  footer,
  onConfirm,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  loading      = false,
  hideClose    = false,
}) {
  const panelRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) document.body.classList.add('overflow-hidden');
    else        document.body.classList.remove('overflow-hidden');
    return () => document.body.classList.remove('overflow-hidden');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={[
          'relative w-full bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]',
          SIZE_CLASSES[size] ?? SIZE_CLASSES.md,
        ].join(' ')}
      >
        {/* Header */}
        {(title || !hideClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            {title && (
              <h2 className="text-base font-semibold text-slate-800">{title}</h2>
            )}
            {!hideClose && (
              <button
                onClick={onClose}
                className="ml-auto text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {/* Footer */}
        {(footer || onConfirm) && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl">
            {footer ?? (
              <>
                <Button variant="secondary" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button
                  variant={confirmVariant}
                  onClick={onConfirm}
                  loading={loading}
                >
                  {confirmLabel}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────
/**
 * A pre-composed confirmation dialog.
 * Usage:
 *   <ConfirmModal
 *     isOpen={showConfirm}
 *     onClose={() => setShowConfirm(false)}
 *     onConfirm={handleDelete}
 *     title="Delete student?"
 *     message="This action cannot be undone."
 *     confirmLabel="Delete"
 *     confirmVariant="danger"
 *   />
 */
export function ConfirmModal({
  isOpen, onClose, onConfirm,
  title   = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel   = 'Confirm',
  confirmVariant = 'danger',
  loading = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      onConfirm={onConfirm}
      confirmLabel={confirmLabel}
      confirmVariant={confirmVariant}
      loading={loading}
    >
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  );
}
