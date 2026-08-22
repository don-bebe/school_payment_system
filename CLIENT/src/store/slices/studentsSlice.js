import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { studentsApi } from '../../api/services';

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const searchStudents = createAsyncThunk(
  'students/search',
  async (params, { rejectWithValue }) => {
    try {
      const res = await studentsApi.search(params);
      return res.data.data; // { items, totalCount, page, pageSize }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const fetchStudentById = createAsyncThunk(
  'students/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await studentsApi.getById(id);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const fetchStudentByNumber = createAsyncThunk(
  'students/fetchByNumber',
  async (num, { rejectWithValue }) => {
    try {
      const res = await studentsApi.getByNumber(num);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const createStudent = createAsyncThunk(
  'students/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await studentsApi.create(data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const updateStudent = createAsyncThunk(
  'students/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await studentsApi.update(id, data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const deactivateStudent = createAsyncThunk(
  'students/deactivate',
  async ({ id, reason, notes }, { rejectWithValue }) => {
    try {
      await studentsApi.deactivateWithReason(id, { reason, notes });
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const bulkEnrolStudents = createAsyncThunk(
  'students/bulkEnrol',
  async (data, { rejectWithValue }) => {
    try {
      const res = await studentsApi.bulkEnrol(data);
      return res.data.data; // Returns BulkEnrolResultDto { enrolled, skipped, skippedReasons }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const fetchGradeView = createAsyncThunk(
  'students/gradeView',
  async (params, { rejectWithValue }) => {
    try {
      const res = await studentsApi.gradeView(params);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const promoteStudents = createAsyncThunk(
  'students/promote',
  async (data, { rejectWithValue }) => {
    try {
      const res = await studentsApi.promote(data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const fetchGraduated = createAsyncThunk(
  'students/fetchGraduated',
  async (_, { rejectWithValue }) => {
    try {
      const res = await studentsApi.getGraduated();
      return res.data.data ?? res.data ?? [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

export const clearStudentArrears = createAsyncThunk(
  'students/clearArrears',
  async ({ studentId, data }, { rejectWithValue }) => {
    try {
      const res = await studentsApi.clearArrears(studentId, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message ?? err.message);
    }
  }
);

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
  list: [],
  selected: null,
  totalCount: 0,
  page: 1,
  pageSize: 20,
  gradeView: [],
  graduated: [],
  loading: false,
  error: null,
  bulkEnrolResult: null, // Store bulk enrolment results
};

// ─── Create Slice ─────────────────────────────────────────────────────────────

const studentsSlice = createSlice({
  name: 'students',
  initialState,
  reducers: {
    clearSelected(state) {
      state.selected = null;
    },
    clearError(state) {
      state.error = null;
    },
    clearGradeView(state) {
      state.gradeView = [];
    },
    clearBulkEnrolResult(state) {
      state.bulkEnrolResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Search Students ────────────────────────────────────────────────
      .addCase(searchStudents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchStudents.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.items;
        state.totalCount = action.payload.totalCount;
        state.page = action.payload.page;
        state.pageSize = action.payload.pageSize;
      })
      .addCase(searchStudents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ── Fetch Student By ID ────────────────────────────────────────────
      .addCase(fetchStudentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStudentById.fulfilled, (state, action) => {
        state.loading = false;
        state.selected = action.payload;
      })
      .addCase(fetchStudentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ── Fetch Student By Number ────────────────────────────────────────
      .addCase(fetchStudentByNumber.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStudentByNumber.fulfilled, (state, action) => {
        state.loading = false;
        state.selected = action.payload;
      })
      .addCase(fetchStudentByNumber.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ── Create Student ─────────────────────────────────────────────────
      .addCase(createStudent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createStudent.fulfilled, (state, action) => {
        state.loading = false;
        state.list.unshift(action.payload);
        state.totalCount += 1;
      })
      .addCase(createStudent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ── Update Student ─────────────────────────────────────────────────
      .addCase(updateStudent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateStudent.fulfilled, (state, action) => {
        state.loading = false;
        state.selected = action.payload;
        const index = state.list.findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
      })
      .addCase(updateStudent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ── Deactivate Student ─────────────────────────────────────────────
      .addCase(deactivateStudent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deactivateStudent.fulfilled, (state, action) => {
        state.loading = false;
        const student = state.list.find(s => s.id === action.payload);
        if (student) student.isActive = false;
        if (state.selected?.id === action.payload) {
          state.selected.isActive = false;
        }
      })
      .addCase(deactivateStudent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ── Bulk Enrol Students ────────────────────────────────────────────
      .addCase(bulkEnrolStudents.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.bulkEnrolResult = null;
      })
      .addCase(bulkEnrolStudents.fulfilled, (state, action) => {
        state.loading = false;
        // Store the BulkEnrolResultDto for display in the UI
        state.bulkEnrolResult = action.payload;
        // Increment total count by number of enrolled students
        if (action.payload?.enrolled) {
          state.totalCount += action.payload.enrolled;
        }
      })
      .addCase(bulkEnrolStudents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ── Fetch Grade View ───────────────────────────────────────────────
      .addCase(fetchGradeView.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGradeView.fulfilled, (state, action) => {
        state.loading = false;
        state.gradeView = action.payload;
      })
      .addCase(fetchGradeView.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ── Promote Students ───────────────────────────────────────────────
      .addCase(promoteStudents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(promoteStudents.fulfilled, (state) => {
        state.loading = false;
        // Clear grade view after successful promotion
        state.gradeView = [];
      })
      .addCase(promoteStudents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ── Graduated / Alumni
      .addCase(fetchGraduated.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(fetchGraduated.fulfilled, (state, action) => { state.loading = false; state.graduated = action.payload; })
      .addCase(fetchGraduated.rejected,  (state, action) => { state.loading = false; state.error = action.payload; })

      // ── Clear Arrears
      .addCase(clearStudentArrears.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(clearStudentArrears.fulfilled, (state) => { state.loading = false; })
      .addCase(clearStudentArrears.rejected,  (state, action) => { state.loading = false; state.error = action.payload; });
  },
});

// ─── Export Actions ───────────────────────────────────────────────────────────
export const { 
  clearSelected, 
  clearError, 
  clearGradeView,
  clearBulkEnrolResult 
} = studentsSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectStudentList    = (state) => state.students.list;
export const selectSelectedStudent = (state) => state.students.selected;
export const selectStudentPaging  = createSelector(
  (state) => state.students.totalCount,
  (state) => state.students.page,
  (state) => state.students.pageSize,
  (total, page, pageSize) => ({ total, page, pageSize })
);
export const selectGradeView       = (state) => state.students.gradeView;
export const selectGraduated       = (state) => state.students.graduated;
export const selectStudentsLoading = (state) => state.students.loading;
export const selectStudentsError   = (state) => state.students.error;
export const selectBulkEnrolResult = (state) => state.students.bulkEnrolResult;

// ─── Default Export ───────────────────────────────────────────────────────────
export default studentsSlice.reducer;