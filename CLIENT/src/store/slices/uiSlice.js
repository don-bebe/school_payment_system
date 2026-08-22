import { createSlice } from '@reduxjs/toolkit';

// Auto-incrementing id so every toast is unique even if dispatched in the same tick
let toastId = 0;

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarCollapsed: false,
    activeModal:      null,   // string key of the open modal | null
    modalData:        null,   // arbitrary payload passed to the modal
    toasts:           [],     // [{ id, type, title, message, duration }]
    printMode:        false,  // true while the receipt print view is active
  },
  reducers: {
    // ── Sidebar
    toggleSidebar(state) { state.sidebarCollapsed = !state.sidebarCollapsed; },
    setSidebarCollapsed(state, action) { state.sidebarCollapsed = action.payload; },

    // ── Modals
    openModal(state, action) {
      state.activeModal = action.payload.modal;
      state.modalData   = action.payload.data ?? null;
    },
    closeModal(state) {
      state.activeModal = null;
      state.modalData   = null;
    },

    // ── Toasts
    addToast(state, action) {
      state.toasts.push({
        id:       ++toastId,
        type:     action.payload.type     ?? 'info',    // 'success' | 'error' | 'warning' | 'info'
        title:    action.payload.title    ?? '',
        message:  action.payload.message  ?? '',
        duration: action.payload.duration ?? 4000,
      });
    },
    removeToast(state, action) {
      state.toasts = state.toasts.filter(t => t.id !== action.payload);
    },
    clearToasts(state) { state.toasts = []; },

    // ── Print mode
    setPrintMode(state, action) { state.printMode = action.payload; },
  },
});

export const {
  toggleSidebar,
  setSidebarCollapsed,
  openModal,
  closeModal,
  addToast,
  removeToast,
  clearToasts,
  setPrintMode,
} = uiSlice.actions;

// ─── Convenience toast action creators ───────────────────────────────────────
// Usage: dispatch(toastSuccess('Payment recorded.'))
export const toastSuccess = (message, title = 'Success') =>
  addToast({ type: 'success', title, message });
export const toastError   = (message, title = 'Error') =>
  addToast({ type: 'error',   title, message });
export const toastWarning = (message, title = 'Warning') =>
  addToast({ type: 'warning', title, message });
export const toastInfo    = (message, title = 'Info') =>
  addToast({ type: 'info',    title, message });

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectSidebarCollapsed = (s) => s.ui.sidebarCollapsed;
export const selectActiveModal      = (s) => s.ui.activeModal;
export const selectModalData        = (s) => s.ui.modalData;
export const selectToasts           = (s) => s.ui.toasts;
export const selectPrintMode        = (s) => s.ui.printMode;

export default uiSlice.reducer;
