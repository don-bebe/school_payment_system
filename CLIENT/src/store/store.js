import { configureStore } from '@reduxjs/toolkit';
import {
  persistStore, persistReducer,
  FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from 'redux';

import authReducer          from './slices/authSlice';
import uiReducer            from './slices/uiSlice';
import settingsReducer      from './slices/settingsSlice';
import dashboardReducer     from './slices/dashboardSlice';
import studentsReducer      from './slices/studentsSlice';
import academicReducer      from './slices/academicSlice';
import paymentsReducer      from './slices/paymentsSlice';
import expensesReducer      from './slices/expensesSlice';
import reportsReducer       from './slices/reportsSlice';
import notificationsReducer from './slices/notificationsSlice';

// ── Only persist auth (JWT token + user) and settings (school info for receipt)
// ── Everything else is refetched fresh on each session
const persistConfig = {
  key:       'school-fees-v1',
  storage,
  whitelist: ['auth', 'settings'],
};

const rootReducer = combineReducers({
  auth:          authReducer,
  ui:            uiReducer,
  settings:      settingsReducer,
  dashboard:     dashboardReducer,
  students:      studentsReducer,
  academic:      academicReducer,
  payments:      paymentsReducer,
  expenses:      expensesReducer,
  reports:       reportsReducer,
  notifications: notificationsReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // redux-persist dispatches these non-serializable actions internally
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: import.meta.env.DEV,
});

export const persistor = persistStore(store);

export default store;
