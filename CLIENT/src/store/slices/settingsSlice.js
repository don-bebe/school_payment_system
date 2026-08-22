import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { adminApi, reportsApi } from '../../api/services';

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchSettings = createAsyncThunk(
  'settings/fetch',
  async (_, { rejectWithValue }) => {
    try {
      // Use the reports endpoint which is accessible to all staff roles
      // (Admin, Receptionist). The admin endpoint is AdminOnly and would
      // block receptionists from loading school name/logo on receipts.
      const res = await reportsApi.getSchoolSettings();
      // Backend returns [{ key, value }] — normalise to a plain object
      const arr = res.data.data ?? res.data ?? [];
      return arr.reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {});
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const saveSetting = createAsyncThunk(
  'settings/save',
  async ({ key, value }, { rejectWithValue }) => {
    try {
      await adminApi.upsertSetting({ key, value });
      return { key, value };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const saveAllSettings = createAsyncThunk(
  'settings/saveAll',
  async (settingsObj, { rejectWithValue }) => {
    // settingsObj = { key: value, ... }
    try {
      const entries = Object.entries(settingsObj);
      await Promise.all(entries.map(([key, value]) => adminApi.upsertSetting({ key, value })));
      return settingsObj;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    // Rock Out College defaults — overridden once fetchSettings resolves
    data: {
      schoolName:     'Rock Out College',
      schoolMotto:    'Patience, Perseverance & Prosperity',
      schoolAddress:  'Stand No. 5932 Stoneridge Phase 1',
      schoolCity:     'Waterfalls, Harare',
      schoolPhone:    '0774 065 625',
      schoolEmail:    '',
      schoolLogo:     '',    // URL or base64 — right crest on receipt
      schoolLogoLeft: '',    // left crest (Zimbabwe coat of arms)
      currency:       'USD',
      receiptFooter:  'With Thanks',
      receiptPrefix:  'RCP',
    },
    loading: false,
    saving:  false,
    error:   null,
  },
  reducers: {
    // Optimistic local update while a save is in-flight (prevents flash-back to old value)
    setLocalSetting(state, action) {
      const { key, value } = action.payload;
      state.data[key] = value;
    },
    resetSettings(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Fetch
      .addCase(fetchSettings.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(fetchSettings.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })
      .addCase(fetchSettings.fulfilled, (s, a) => {
        s.loading = false;
        // Merge server values over defaults — server always wins
        s.data = { ...s.data, ...a.payload };
      })

      // ── Save single
      .addCase(saveSetting.pending,   (s) => { s.saving = true; s.error = null; })
      .addCase(saveSetting.rejected,  (s, a) => { s.saving = false; s.error = a.payload; })
      .addCase(saveSetting.fulfilled, (s, a) => {
        s.saving = false;
        s.data[a.payload.key] = a.payload.value;
      })

      // ── Save all
      .addCase(saveAllSettings.pending,   (s) => { s.saving = true; s.error = null; })
      .addCase(saveAllSettings.rejected,  (s, a) => { s.saving = false; s.error = a.payload; })
      .addCase(saveAllSettings.fulfilled, (s, a) => {
        s.saving = false;
        s.data = { ...s.data, ...a.payload };
      });
  },
});

export const { setLocalSetting, resetSettings } = settingsSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectSettings        = (s) => s.settings.data;
export const selectSettingsLoading = (s) => s.settings.loading;
export const selectSettingsSaving  = (s) => s.settings.saving;
export const selectSettingsError   = (s) => s.settings.error;

/** Convenience: select a single setting by key */
export const selectSetting = (key) => (s) => s.settings.data[key];

export default settingsSlice.reducer;
