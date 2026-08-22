import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '../../api/services';

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const res = await authApi.login(credentials);
      return res.data.data; // { token, user }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const fetchMe = createAsyncThunk(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const res = await authApi.me();
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (data, { rejectWithValue }) => {
    try {
      const res = await authApi.register(data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const fetchUsers = createAsyncThunk(
  'auth/fetchUsers',
  async (_, { rejectWithValue }) => {
    try {
      const res = await authApi.getUsers();
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const deactivateUser = createAsyncThunk(
  'auth/deactivate',
  async (id, { rejectWithValue }) => {
    try {
      await authApi.deactivate(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const reactivateUser = createAsyncThunk(
  'auth/reactivate',
  async (id, { rejectWithValue }) => {
    try {
      await authApi.reactivate(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (data, { rejectWithValue }) => {
    try {
      await authApi.changePassword(data);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const saveSignature = createAsyncThunk(
  'auth/saveSignature',
  async (signatureImageBase64, { rejectWithValue }) => {
    try {
      const res = await authApi.saveSignature({ signatureImageBase64 });
      return res.data.data;   // updated UserDto
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token:   null,
    user:    null,
    users:   [],       // staff list (Admin panel)
    loading: false,
    error:   null,
  },
  reducers: {
    logout(state) {
      state.token = null;
      state.user  = null;
      state.users = [];
    },
    clearError(state) { state.error = null; },
    // Manually update current user fields (e.g. after profile edit)
    updateCurrentUser(state, action) {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Login
      .addCase(login.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(login.fulfilled, (s, a) => {
        s.loading = false;
        s.token   = a.payload.token;
        s.user    = a.payload.user;
      })
      .addCase(login.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })

      // ── Fetch me (refresh profile)
      .addCase(fetchMe.fulfilled, (s, a) => { s.user = a.payload; })

      // ── Register new staff
      .addCase(registerUser.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(registerUser.fulfilled, (s, a) => {
        s.loading = false;
        s.users.push(a.payload);
      })
      .addCase(registerUser.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })

      // ── Staff list
      .addCase(fetchUsers.pending,   (s) => { s.loading = true; })
      .addCase(fetchUsers.fulfilled, (s, a) => { s.loading = false; s.users = a.payload; })
      .addCase(fetchUsers.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })

      // ── Deactivate / Reactivate
      .addCase(deactivateUser.fulfilled, (s, a) => {
        const u = s.users.find(x => x.id === a.payload);
        if (u) u.isActive = false;
      })
      .addCase(reactivateUser.fulfilled, (s, a) => {
        const u = s.users.find(x => x.id === a.payload);
        if (u) u.isActive = true;
      })

      // ── Change password
      .addCase(changePassword.pending,  (s) => { s.loading = true; s.error = null; })
      .addCase(changePassword.fulfilled,(s) => { s.loading = false; })
      .addCase(changePassword.rejected, (s, a) => { s.loading = false; s.error = a.payload; })

      // ── Save signature — update current user in store
      .addCase(saveSignature.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(saveSignature.fulfilled, (s, a) => {
        s.loading = false;
        if (s.user) s.user = { ...s.user, signatureImageBase64: a.payload?.signatureImageBase64 ?? null };
      })
      .addCase(saveSignature.rejected,  (s, a) => { s.loading = false; s.error = a.payload; });
  },
});

export const { logout, clearError, updateCurrentUser } = authSlice.actions;


// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectCurrentUser  = (s) => s.auth.user;
export const selectToken        = (s) => s.auth.token;
export const selectIsAuth       = (s) => !!s.auth.token;
export const selectIsAdmin      = (s) => s.auth.user?.role === 'Admin';
export const selectAuthLoading  = (s) => s.auth.loading;
export const selectAuthError    = (s) => s.auth.error;
export const selectStaffUsers   = (s) => s.auth.users;

export default authSlice.reducer;
