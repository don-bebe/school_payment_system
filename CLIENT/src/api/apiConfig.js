import axios from 'axios';
import store from '../store/store';

// ─── Resolve base URL from Electron config (supports LAN multi-computer setup) ─
// Reads config.json from AppData via Electron IPC. Falls back to localhost.
async function resolveBaseURL() {
  try {
    if (window.electronAPI?.getConfig) {
      const config = await window.electronAPI.getConfig();
      return `${config.apiUrl}/api`;
    }
  } catch {
    // non-fatal — fall through to default
  }
  return 'http://localhost:5221/api';
}

// ─── Base instance ─────────────────────────────────────────────────────────────
// baseURL starts as localhost then is updated once config is resolved.
const api = axios.create({
  baseURL: 'http://localhost:5221/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Apply the resolved URL as soon as possible (non-blocking)
resolveBaseURL().then((url) => {
  api.defaults.baseURL = url;
});

// ─── Request interceptor — attach JWT from localStorage ────────────────────────
api.interceptors.request.use((config) => {
  // Read from Redux state (synchronous, always current) instead of localStorage
  const token = store.getState().auth.token ?? localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response interceptor — unwrap envelope, handle 401 globally ───────────────
api.interceptors.response.use(
  (response) => {
    // Our backend always returns { success, message, data, errors }
    // Unwrap so callers get response.data directly
    return response;
  },
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // Only treat as a session expiry if we actually had a token.
      // If there's no token, the 401 is expected (e.g. a stale polling
      // call fired before the user logged in) — don't redirect.
      const hadToken = !!store.getState().auth.token;
      if (hadToken) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
      // Swallow the error silently when not authenticated — it will show
      // as a normal rejected thunk, not a red console error
      return Promise.reject({ message: 'Unauthorised', errors: null, status: 401 });
    }

    // Normalise error shape so every slice can rely on error.message
    const message =
      error.response?.data?.message ||
      error.response?.data?.title ||
      error.message ||
      'An unexpected error occurred.';

    const errors = error.response?.data?.errors || null;

    return Promise.reject({ message, errors, status });
  }
);

export default api;
