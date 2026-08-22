import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { academicApi } from '../../api/services';

// ─── Thunks ───────────────────────────────────────────────────────────────────

// ── Grades
export const fetchGrades = createAsyncThunk(
  'academic/fetchGrades',
  async (_, { rejectWithValue }) => {
    try {
      const res = await academicApi.getGrades();
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createGrade = createAsyncThunk(
  'academic/createGrade',
  async (data, { rejectWithValue }) => {
    try {
      const res = await academicApi.createGrade(data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateGrade = createAsyncThunk(
  'academic/updateGrade',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await academicApi.updateGrade(id, data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ── Academic Years
export const fetchYears = createAsyncThunk(
  'academic/fetchYears',
  async (_, { rejectWithValue }) => {
    try {
      const res = await academicApi.getYears();
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchActiveYear = createAsyncThunk(
  'academic/fetchActiveYear',
  async (_, { rejectWithValue }) => {
    try {
      const res = await academicApi.getActiveYear();
      return res.data.data;
    } catch (err) {
      // 404 = no active year configured yet — not a real error, return null
      if (err.status === 404) return null;
      return rejectWithValue(err.message);
    }
  }
);

export const createYear = createAsyncThunk(
  'academic/createYear',
  async (data, { rejectWithValue }) => {
    try {
      const res = await academicApi.createYear(data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const setActiveYear = createAsyncThunk(
  'academic/setActiveYear',
  async (id, { rejectWithValue, dispatch }) => {
    try {
      await academicApi.setActiveYear(id);
      // Refresh both lists so UI stays in sync
      dispatch(fetchYears());
      dispatch(fetchActiveYear());
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ── Terms
export const fetchTerms = createAsyncThunk(
  'academic/fetchTerms',
  async (yearId, { rejectWithValue }) => {
    // Guard: skip the request if no year is active yet
    if (!yearId) return [];
    try {
      const res = await academicApi.getTerms(yearId);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchActiveTerm = createAsyncThunk(
  'academic/fetchActiveTerm',
  async (_, { rejectWithValue }) => {
    try {
      const res = await academicApi.getActiveTerm();
      return res.data.data;
    } catch (err) {
      // 404 = no active term configured yet — not a real error, return null
      if (err.status === 404) return null;
      return rejectWithValue(err.message);
    }
  }
);

export const createTerm = createAsyncThunk(
  'academic/createTerm',
  async (data, { rejectWithValue }) => {
    try {
      const res = await academicApi.createTerm(data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateTerm = createAsyncThunk(
  'academic/updateTerm',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await academicApi.updateTerm(id, data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const setActiveTerm = createAsyncThunk(
  'academic/setActiveTerm',
  async ({ id, yearId }, { rejectWithValue, dispatch }) => {
    try {
      await academicApi.setActiveTerm(id);
      dispatch(fetchTerms(yearId));
      dispatch(fetchActiveTerm());
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ── Fees
export const fetchTermFees = createAsyncThunk(
  'academic/fetchTermFees',
  async (termId, { rejectWithValue }) => {
    // Guard: skip the request if no term is active yet
    if (!termId) return [];
    try {
      const res = await academicApi.getTermFees(termId);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const setTermFee = createAsyncThunk(
  'academic/setTermFee',
  async (data, { rejectWithValue }) => {
    try {
      const res = await academicApi.setFee(data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchStudentFee = createAsyncThunk(
  'academic/fetchStudentFee',
  async (params, { rejectWithValue }) => {
    try {
      const res = await academicApi.getStudentFee(params);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const academicSlice = createSlice({
  name: 'academic',
  initialState: {
    grades:      [],
    years:       [],
    activeYear:  null,
    terms:       [],
    activeTerm:  null,
    termFees:    [],
    studentFee:  null,   // fee amount for a specific student/term lookup
    loading:     false,
    error:       null,
  },
  reducers: {
    clearError(state)      { state.error      = null; },
    clearTermFees(state)   { state.termFees   = [];   },
    clearStudentFee(state) { state.studentFee = null; },
  },
  extraReducers: (b) => {
    b
      // ── Grades
      .addCase(fetchGrades.fulfilled,  (s, a) => { s.grades = a.payload; })
      .addCase(createGrade.fulfilled,  (s, a) => { s.grades.push(a.payload); })
      .addCase(updateGrade.fulfilled,  (s, a) => {
        const idx = s.grades.findIndex(g => g.id === a.payload.id);
        if (idx !== -1) s.grades[idx] = a.payload;
      })

      // ── Years
      .addCase(fetchYears.fulfilled,      (s, a) => { s.years      = a.payload; })
      .addCase(fetchActiveYear.fulfilled, (s, a) => { s.activeYear = a.payload; })
      .addCase(createYear.fulfilled,      (s, a) => { s.years.unshift(a.payload); })
      .addCase(setActiveYear.fulfilled,   (s) => { /* handled by fetchYears/fetchActiveYear */ })

      // ── Terms
      .addCase(fetchTerms.fulfilled,      (s, a) => { s.terms      = a.payload; })
      .addCase(fetchActiveTerm.fulfilled, (s, a) => { s.activeTerm = a.payload; })
      .addCase(createTerm.fulfilled,      (s, a) => { s.terms.unshift(a.payload); })
      .addCase(updateTerm.fulfilled,      (s, a) => {
        const idx = s.terms.findIndex(t => t.id === a.payload.id);
        if (idx !== -1) s.terms[idx] = a.payload;
      })
      .addCase(setActiveTerm.fulfilled,   (s) => { /* handled by fetchTerms/fetchActiveTerm */ })

      // ── Fees
      .addCase(fetchTermFees.fulfilled,   (s, a) => { s.termFees   = a.payload; })
      .addCase(setTermFee.fulfilled,      (s, a) => {
        const idx = s.termFees.findIndex(f => f.id === a.payload.id);
        if (idx !== -1) s.termFees[idx] = a.payload;
        else s.termFees.push(a.payload);
      })
      .addCase(fetchStudentFee.fulfilled, (s, a) => { s.studentFee = a.payload; })

      // ── Matchers (must come after all addCase calls)
      .addMatcher(
        (action) => action.type.startsWith('academic/') && action.type.endsWith('/pending'),
        (state) => {
          state.loading = true;
          state.error = null;
        }
      )
      .addMatcher(
        (action) => action.type.startsWith('academic/') && action.type.endsWith('/rejected'),
        (state, action) => {
          state.loading = false;
          state.error = action.payload;
        }
      )
      .addMatcher(
        (action) => action.type.startsWith('academic/') && action.type.endsWith('/fulfilled'),
        (state) => {
          state.loading = false;
        }
      );
  },
});

export const { clearError: clearAcademicError, clearTermFees, clearStudentFee } = academicSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectGrades      = (s) => s.academic.grades;
export const selectYears       = (s) => s.academic.years;
export const selectActiveYear  = (s) => s.academic.activeYear;
export const selectTerms       = (s) => s.academic.terms;
export const selectActiveTerm  = (s) => s.academic.activeTerm;
export const selectTermFees    = (s) => s.academic.termFees;
export const selectStudentFee  = (s) => s.academic.studentFee;
export const selectAcademicLoading = (s) => s.academic.loading;
export const selectAcademicError   = (s) => s.academic.error;

export default academicSlice.reducer;