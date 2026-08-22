import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { expensesApi } from '../../api/services';

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchExpenses = createAsyncThunk(
  'expenses/fetch',
  async (params, { rejectWithValue }) => {
    try {
      const res = await expensesApi.getByRange(params);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const fetchExpenseById = createAsyncThunk(
  'expenses/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await expensesApi.getById(id);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const createExpense = createAsyncThunk(
  'expenses/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await expensesApi.create(data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const updateExpense = createAsyncThunk(
  'expenses/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await expensesApi.update(id, data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const deleteExpense = createAsyncThunk(
  'expenses/delete',
  async (id, { rejectWithValue }) => {
    try {
      await expensesApi.delete(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'expenses/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const res = await expensesApi.getCategories();
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const createCategory = createAsyncThunk(
  'expenses/createCategory',
  async (data, { rejectWithValue }) => {
    try {
      const res = await expensesApi.createCategory(data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const expensesSlice = createSlice({
  name: 'expenses',
  initialState: {
    list:       [],    // expenses for the queried date range
    selected:   null,  // single expense detail
    categories: [],
    loading:    false,
    error:      null,
  },
  reducers: {
    clearSelected(state)  { state.selected = null; },
    clearList(state)      { state.list     = [];   },
    clearError(state)     { state.error    = null; },
  },
  extraReducers: (b) => {
    b
      // ── Fetch list
      .addCase(fetchExpenses.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(fetchExpenses.fulfilled, (s, a) => { s.loading = false; s.list = a.payload; })
      .addCase(fetchExpenses.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })

      // ── Fetch single
      .addCase(fetchExpenseById.pending,   (s) => { s.loading = true; })
      .addCase(fetchExpenseById.fulfilled, (s, a) => { s.loading = false; s.selected = a.payload; })
      .addCase(fetchExpenseById.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })

      // ── Create
      .addCase(createExpense.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(createExpense.fulfilled, (s, a) => {
        s.loading = false;
        s.list.unshift(a.payload);
      })
      .addCase(createExpense.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })

      // ── Update
      .addCase(updateExpense.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(updateExpense.fulfilled, (s, a) => {
        s.loading = false;
        const idx = s.list.findIndex(x => x.id === a.payload.id);
        if (idx !== -1) s.list[idx] = a.payload;
        if (s.selected?.id === a.payload.id) s.selected = a.payload;
      })
      .addCase(updateExpense.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })

      // ── Delete
      .addCase(deleteExpense.pending,   (s) => { s.loading = true; })
      .addCase(deleteExpense.fulfilled, (s, a) => {
        s.loading  = false;
        s.list     = s.list.filter(x => x.id !== a.payload);
        if (s.selected?.id === a.payload) s.selected = null;
      })
      .addCase(deleteExpense.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })

      // ── Categories
      .addCase(fetchCategories.fulfilled,  (s, a) => { s.categories = a.payload; })
      .addCase(createCategory.fulfilled,   (s, a) => { s.categories.push(a.payload); });
  },
});

export const {
  clearSelected: clearSelectedExpense,
  clearList:     clearExpenseList,
  clearError:    clearExpensesError,
} = expensesSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectExpenses         = (s) => s.expenses.list;
export const selectSelectedExpense  = (s) => s.expenses.selected;
export const selectCategories       = (s) => s.expenses.categories;
export const selectExpensesLoading  = (s) => s.expenses.loading;
export const selectExpensesError    = (s) => s.expenses.error;

export default expensesSlice.reducer;
