import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { notificationsApi } from '../../api/services';

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await notificationsApi.getAll();
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const fetchUnreadNotifications = createAsyncThunk(
  'notifications/fetchUnread',
  async (_, { rejectWithValue }) => {
    try {
      const res = await notificationsApi.getUnread();
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchCount',
  async (_, { rejectWithValue }) => {
    try {
      const res = await notificationsApi.getCount();
      return res.data.data; // number
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  },
  { condition: (_, { getState }) => !!getState().auth?.token }
);

export const markRead = createAsyncThunk(
  'notifications/markRead',
  async (id, { rejectWithValue }) => {
    try {
      await notificationsApi.markRead(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const markAllRead = createAsyncThunk(
  'notifications/markAllRead',
  async (_, { rejectWithValue }) => {
    try {
      await notificationsApi.markAllRead();
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    list:        [],   // full notification list
    unreadCount: 0,    // badge counter — fetched independently on polling
    loading:     false,
  },
  reducers: {
    // Allow TopBar to directly set count from poll without refetching whole list
    setUnreadCount(state, action) {
      state.unreadCount = action.payload;
    },
  },
  extraReducers: (b) => {
    b
      // ── Fetch all
      .addCase(fetchNotifications.pending,   (s) => { s.loading = true; })
      .addCase(fetchNotifications.fulfilled, (s, a) => {
        s.loading = false;
        s.list    = a.payload;
        // Sync count from full list
        s.unreadCount = a.payload.filter(n => !n.isRead).length;
      })
      .addCase(fetchNotifications.rejected,  (s) => { s.loading = false; })

      // ── Fetch unread only
      .addCase(fetchUnreadNotifications.fulfilled, (s, a) => {
        s.list        = a.payload;
        s.unreadCount = a.payload.length;
      })

      // ── Poll: just the count (lightweight, runs every 60 s)
      .addCase(fetchUnreadCount.fulfilled, (s, a) => {
        s.unreadCount = a.payload ?? 0;
      })

      // ── Mark single read (optimistic)
      .addCase(markRead.fulfilled, (s, a) => {
        const n = s.list.find(x => x.id === a.payload);
        if (n && !n.isRead) {
          n.isRead      = true;
          s.unreadCount = Math.max(0, s.unreadCount - 1);
        }
      })

      // ── Mark all read (optimistic)
      .addCase(markAllRead.fulfilled, (s) => {
        s.list.forEach(n => { n.isRead = true; });
        s.unreadCount = 0;
      });
  },
});

export const { setUnreadCount } = notificationsSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectNotifications  = (s) => s.notifications.list;
export const selectUnreadCount    = (s) => s.notifications.unreadCount;
export const selectNotifLoading   = (s) => s.notifications.loading;

export default notificationsSlice.reducer;
