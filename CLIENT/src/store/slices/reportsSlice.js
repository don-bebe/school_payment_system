import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { reportsApi } from '../../api/services';

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchDailyReport = createAsyncThunk(
  'reports/fetchDaily',
  async (params, { rejectWithValue }) => {
    try {
      const res = await reportsApi.getDaily(params);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const fetchRangeReport = createAsyncThunk(
  'reports/fetchRange',
  async (params, { rejectWithValue }) => {
    try {
      const res = await reportsApi.getRange(params);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const fetchArrearsReport = createAsyncThunk(
  'reports/fetchArrears',
  async (params, { rejectWithValue }) => {
    try {
      const res = await reportsApi.getArrears(params);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const fetchTransportReport = createAsyncThunk(
  'reports/fetchTransport',
  async (params, { rejectWithValue }) => {
    try {
      const res = await reportsApi.getTransport(params);
      return res.data.data ?? res.data ?? [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const fetchTripReport = createAsyncThunk(
  'reports/fetchTrips',
  async (params, { rejectWithValue }) => {
    try {
      const res = await reportsApi.getTrips(params);
      return res.data.data ?? res.data ?? [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const fetchTransferLog = createAsyncThunk(
  'reports/fetchTransfers',
  async (params, { rejectWithValue }) => {
    try {
      const res = await reportsApi.getTransfers(params);
      return res.data.data ?? res.data ?? [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const fetchUniformSales = createAsyncThunk(
  'reports/fetchUniforms',
  async (params, { rejectWithValue }) => {
    try {
      const res = await reportsApi.getUniforms(params);
      return res.data.data ?? res.data ?? [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const fetchStandaloneFeesReport = createAsyncThunk(
  'reports/fetchStandaloneFees',
  async (params, { rejectWithValue }) => {
    try {
      const res = await reportsApi.getStandaloneFees(params.academicYearId, params.feeType ?? 'all');
      return res.data.data ?? res.data ?? [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const reportsSlice = createSlice({
  name: 'reports',
  initialState: {
    daily:     null,
    range:     null,
    arrears:   null,
    transport: [],
    trips:     [],
    transfers: [],
    uniforms:  [],
    standaloneFees: [],
    loading:   false,
    error:     null,
  },
  reducers: {
    clearReports(state) {
      state.daily = null; state.range = null; state.arrears = null;
      state.transport = []; state.trips = []; state.transfers = [];
      state.error = null;
    },
    clearDailyReport(state)   { state.daily     = null; },
    clearRangeReport(state)   { state.range     = null; },
    clearArrearsReport(state) { state.arrears   = null; },
  },
  extraReducers: (b) => {
    b
      .addCase(fetchDailyReport.pending,   (s) => { s.loading = true;  s.error = null; })
      .addCase(fetchDailyReport.fulfilled, (s, a) => { s.loading = false; s.daily   = a.payload; })
      .addCase(fetchDailyReport.rejected,  (s, a) => { s.loading = false; s.error   = a.payload; })

      .addCase(fetchRangeReport.pending,   (s) => { s.loading = true;  s.error = null; })
      .addCase(fetchRangeReport.fulfilled, (s, a) => { s.loading = false; s.range   = a.payload; })
      .addCase(fetchRangeReport.rejected,  (s, a) => { s.loading = false; s.error   = a.payload; })

      .addCase(fetchArrearsReport.pending,   (s) => { s.loading = true;  s.error = null; })
      .addCase(fetchArrearsReport.fulfilled, (s, a) => { s.loading = false; s.arrears = a.payload; })
      .addCase(fetchArrearsReport.rejected,  (s, a) => { s.loading = false; s.error   = a.payload; })

      .addCase(fetchTransportReport.pending,   (s) => { s.loading = true;  s.error = null; })
      .addCase(fetchTransportReport.fulfilled, (s, a) => { s.loading = false; s.transport = a.payload; })
      .addCase(fetchTransportReport.rejected,  (s, a) => { s.loading = false; s.error     = a.payload; })

      .addCase(fetchTripReport.pending,   (s) => { s.loading = true;  s.error = null; })
      .addCase(fetchTripReport.fulfilled, (s, a) => { s.loading = false; s.trips = a.payload; })
      .addCase(fetchTripReport.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })

      .addCase(fetchTransferLog.pending,   (s) => { s.loading = true;  s.error = null; })
      .addCase(fetchTransferLog.fulfilled, (s, a) => { s.loading = false; s.transfers = a.payload; })
      .addCase(fetchTransferLog.rejected,  (s, a) => { s.loading = false; s.error     = a.payload; })

      .addCase(fetchUniformSales.pending,   (s) => { s.loading = true;  s.error = null; })
      .addCase(fetchUniformSales.fulfilled, (s, a) => { s.loading = false; s.uniforms = a.payload; })
      .addCase(fetchUniformSales.rejected,  (s, a) => { s.loading = false; s.error    = a.payload; })

      .addCase(fetchStandaloneFeesReport.pending,   (s) => { s.loading = true;  s.error = null; })
      .addCase(fetchStandaloneFeesReport.fulfilled, (s, a) => { s.loading = false; s.standaloneFees = a.payload; })
      .addCase(fetchStandaloneFeesReport.rejected,  (s, a) => { s.loading = false; s.error          = a.payload; });
  },
});

export const {
  clearReports,
  clearDailyReport,
  clearRangeReport,
  clearArrearsReport,
} = reportsSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectDailyReport      = (s) => s.reports.daily;
export const selectRangeReport      = (s) => s.reports.range;
export const selectArrearsReport    = (s) => s.reports.arrears;
export const selectTransportReport      = (s) => s.reports.transport;
export const selectTripReport           = (s) => s.reports.trips;
export const selectTransferLog          = (s) => s.reports.transfers;
export const selectUniformSales         = (s) => s.reports.uniforms;
export const selectStandaloneFeesReport = (s) => s.reports.standaloneFees;
export const selectReportsLoading       = (s) => s.reports.loading;
export const selectReportsError         = (s) => s.reports.error;

export default reportsSlice.reducer;
