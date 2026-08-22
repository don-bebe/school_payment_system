import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { dashboardApi } from '../../api/services';

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchDashboard = createAsyncThunk(
  'dashboard/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await dashboardApi.getSummary();
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  },
  { condition: (_, { getState }) => !!getState().auth?.token }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    summary:     null,   // full dashboard payload from API
    loading:     false,
    error:       null,
    lastFetched: null,   // timestamp — used to decide whether to refetch
  },
  reducers: {
    clearDashboard(state) {
      state.summary     = null;
      state.lastFetched = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(fetchDashboard.fulfilled, (s, a) => {
        s.loading     = false;
        s.summary     = a.payload;
        s.lastFetched = Date.now();
      })
      .addCase(fetchDashboard.rejected,  (s, a) => { s.loading = false; s.error = a.payload; });
  },
});

export const { clearDashboard } = dashboardSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectDashboard        = (s) => s.dashboard.summary;
export const selectDashboardLoading = (s) => s.dashboard.loading;
export const selectDashboardError   = (s) => s.dashboard.error;
export const selectDashboardAge     = (s) => s.dashboard.lastFetched;

export default dashboardSlice.reducer;
