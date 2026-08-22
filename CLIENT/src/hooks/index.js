import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect, useRef, useState } from 'react';
import { selectCurrentUser, selectIsAuth, selectIsAdmin } from '../store/slices/authSlice';
import { addToast, openModal, closeModal } from '../store/slices/uiSlice';

// ─── Re-export default-export hooks so everything comes from one place ─────────
export { default as useElectronPrint } from './useElectronPrint';
export { default as useConfirm       } from './useConfirm.jsx';
export { default as useFormState     } from './useFormState';

// ─── Typed dispatch / selector ────────────────────────────────────────────────
export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;

// ─── Auth ─────────────────────────────────────────────────────────────────────
export function useAuth() {
  const user    = useAppSelector(selectCurrentUser);
  const isAuth  = useAppSelector(selectIsAuth);
  const isAdmin = useAppSelector(selectIsAdmin);
  const role    = user?.role ?? null;
  return { user, isAuth, isAdmin, role };
}

// ─── Permission gate ──────────────────────────────────────────────────────────
// Usage: const canEdit = usePermission(['Admin', 'Receptionist']);
export function usePermission(allowedRoles = []) {
  const { role } = useAuth();
  return allowedRoles.includes(role);
}

// ─── Toast ────────────────────────────────────────────────────────────────────
export function useToast() {
  const dispatch = useAppDispatch();
  return {
    success: (message, title) => dispatch(addToast({ type: 'success', title: title ?? 'Success', message })),
    error:   (message, title) => dispatch(addToast({ type: 'error',   title: title ?? 'Error',   message })),
    warning: (message, title) => dispatch(addToast({ type: 'warning', title: title ?? 'Warning', message })),
    info:    (message, title) => dispatch(addToast({ type: 'info',    title: title ?? 'Info',    message })),
  };
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function useModal() {
  const dispatch = useAppDispatch();
  return {
    open:  (modal, data) => dispatch(openModal({ modal, data })),
    close: ()            => dispatch(closeModal()),
  };
}

// ─── Debounce ─────────────────────────────────────────────────────────────────
export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export function usePagination({ totalCount, pageSize = 20 }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(totalCount / pageSize);
  const goTo  = useCallback((p) => setPage(Math.max(1, Math.min(p, totalPages))), [totalPages]);
  const next  = useCallback(()  => goTo(page + 1), [page, goTo]);
  const prev  = useCallback(()  => goTo(page - 1), [page, goTo]);
  const reset = useCallback(()  => setPage(1), []);
  return { page, totalPages, goTo, next, prev, reset, hasPrev: page > 1, hasNext: page < totalPages };
}

// ─── Generic async API caller ─────────────────────────────────────────────────
// Usage: const { execute, loading, error, data } = useApi(studentsApi.create);
//        await execute(payload);
export function useApi(apiFn) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [data,    setData]    = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const res     = await apiFn(...args);
      const payload = res.data?.data ?? res.data;
      if (mounted.current) setData(payload);
      return payload;
    } catch (err) {
      if (mounted.current) setError(err.message ?? 'Error');
      throw err;
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [apiFn]);

  return { execute, loading, error, data };
}

// ─── LocalStorage with JSON serialization ─────────────────────────────────────
export function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch { return defaultValue; }
  });

  const set = useCallback((newVal) => {
    setValue(newVal);
    localStorage.setItem(key, JSON.stringify(newVal));
  }, [key]);

  const remove = useCallback(() => {
    setValue(defaultValue);
    localStorage.removeItem(key);
  }, [key, defaultValue]);

  return [value, set, remove];
}

// ─── Click outside (for dropdowns / modals) ───────────────────────────────────
export function useClickOutside(ref, callback) {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) callback();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, callback]);
}

// ─── Auto-poll (e.g. notifications badge every 60s) ───────────────────────────
export function usePolling(fn, intervalMs = 60000, enabled = true) {
  const savedFn = useRef(fn);
  useEffect(() => { savedFn.current = fn; }, [fn]);

  useEffect(() => {
    if (!enabled) return;
    savedFn.current();                              // immediate first call
    const id = setInterval(() => savedFn.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}