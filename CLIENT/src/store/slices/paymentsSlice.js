import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { paymentsApi } from '../../api/services';

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const createPayment = createAsyncThunk(
  'payments/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await paymentsApi.create(data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchPaymentById = createAsyncThunk(
  'payments/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await paymentsApi.getById(id);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchStudentPayments = createAsyncThunk(
  'payments/fetchByStudent',
  async ({ id, params }, { rejectWithValue }) => {
    try {
      const res = await paymentsApi.getByStudent(id, params);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchReceipt = createAsyncThunk(
  'payments/fetchReceipt',
  async (id, { rejectWithValue }) => {
    try {
      const res = await paymentsApi.getReceipt(id);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchReceiptByNum = createAsyncThunk(
  'payments/fetchReceiptByNum',
  async (num, { rejectWithValue }) => {
    try {
      const res = await paymentsApi.getReceiptByNum(num);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const markReceiptPrinted = createAsyncThunk(
  'payments/markPrinted',
  async (id, { rejectWithValue }) => {
    try {
      await paymentsApi.markPrinted(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const reversePayment = createAsyncThunk(
  'payments/reverse',
  async (data, { rejectWithValue }) => {
    try {
      await paymentsApi.reverse(data);
      return data.paymentId;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const editPayment = createAsyncThunk(
  'payments/edit',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await paymentsApi.edit(id, data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const fetchPaymentMethods = createAsyncThunk(
  'payments/fetchMethods',
  async (_, { rejectWithValue }) => {
    try {
      const res = await paymentsApi.getMethods();
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const paymentsSlice = createSlice({
  name: 'payments',
  initialState: {
    list:     [],    // payment history for the selected student
    selected: null,  // single payment detail view
    receipt:  null,  // receipt data for ReceiptPage
    methods:  [],    // payment methods (Cash, EcoCash, etc.)
    loading:  false,
    error:    null,
  },
  reducers: {
    clearReceipt(state)      { state.receipt  = null; },
    clearSelected(state)     { state.selected = null; },
    clearPaymentList(state)  { state.list     = [];   },
    clearError(state)        { state.error    = null; },
  },
  extraReducers: (b) => {
    b
      // ── Create payment
      .addCase(createPayment.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(createPayment.fulfilled, (s, a) => {
        s.loading = false;
        s.list.unshift(a.payload);
        s.selected = a.payload;
      })
      .addCase(createPayment.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })

      // ── Fetch single payment
      .addCase(fetchPaymentById.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(fetchPaymentById.fulfilled, (s, a) => { s.loading = false; s.selected = a.payload; })
      .addCase(fetchPaymentById.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })

      // ── Fetch student payment history
      .addCase(fetchStudentPayments.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(fetchStudentPayments.fulfilled, (s, a) => { s.loading = false; s.list = a.payload; })
      .addCase(fetchStudentPayments.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })

      // ── Receipt
      .addCase(fetchReceipt.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(fetchReceipt.fulfilled, (s, a) => { s.loading = false; s.receipt = a.payload; })
      .addCase(fetchReceipt.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })

      .addCase(fetchReceiptByNum.fulfilled, (s, a) => { s.receipt = a.payload; })

      // ── Mark printed (optimistic update on the receipt object)
      .addCase(markReceiptPrinted.fulfilled, (s, a) => {
        if (s.receipt?.id === a.payload) s.receipt.isPrinted = true;
      })

      // ── Reverse payment (mark as reversed in the list)
      .addCase(reversePayment.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(reversePayment.fulfilled, (s, a) => {
        s.loading = false;
        const p = s.list.find(x => x.id === a.payload);
        if (p) p.status = 'Reversed';
        if (s.selected?.id === a.payload) s.selected.status = 'Reversed';
      })
      .addCase(reversePayment.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })

      // ── Edit payment (correct breakdown allocation)
      .addCase(editPayment.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(editPayment.fulfilled, (s, a) => {
        s.loading  = false;
        s.selected = a.payload;
        const idx  = s.list.findIndex(x => x.id === a.payload.id);
        if (idx !== -1) s.list[idx] = a.payload;
      })
      .addCase(editPayment.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })

      // ── Payment methods
      .addCase(fetchPaymentMethods.fulfilled, (s, a) => { s.methods = a.payload; });
  },
});

export const {
  clearReceipt,
  clearSelected: clearSelectedPayment,
  clearPaymentList,
  clearError: clearPaymentError,
} = paymentsSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectPaymentList      = (s) => s.payments.list;
export const selectSelectedPayment  = (s) => s.payments.selected;
export const selectReceipt          = (s) => s.payments.receipt;
export const selectPaymentMethods   = (s) => s.payments.methods;
export const selectPaymentsLoading  = (s) => s.payments.loading;
export const selectPaymentsError    = (s) => s.payments.error;

export default paymentsSlice.reducer;