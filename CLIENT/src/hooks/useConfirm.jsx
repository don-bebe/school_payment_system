import { useState, useCallback, useRef } from 'react';
import { ConfirmModal } from '../components/ui/Modal';

export default function useConfirm() {
  const [state, setState] = useState({
    open:    false,
    title:   'Are you sure?',
    message: 'This action cannot be undone.',
    label:   'Confirm',
    variant: 'danger',
  });

  // Store the resolve function between renders
  const resolveRef = useRef(null);

  const confirm = useCallback(({
    title   = 'Are you sure?',
    message = 'This action cannot be undone.',
    label   = 'Confirm',
    variant = 'danger',
  } = {}) => {
    setState({ open: true, title, message, label, variant });
    return new Promise((resolve) => { resolveRef.current = resolve; });
  }, []);

  const handleConfirm = useCallback(() => {
    setState(s => ({ ...s, open: false }));
    resolveRef.current?.(true);
  }, []);

  const handleCancel = useCallback(() => {
    setState(s => ({ ...s, open: false }));
    resolveRef.current?.(false);
  }, []);

  const ConfirmDialog = useCallback(() => (
    <ConfirmModal
      isOpen={state.open}
      onClose={handleCancel}
      onConfirm={handleConfirm}
      title={state.title}
      message={state.message}
      confirmLabel={state.label}
      confirmVariant={state.variant}
    />
  ), [state, handleCancel, handleConfirm]);

  return { confirm, ConfirmDialog };
}