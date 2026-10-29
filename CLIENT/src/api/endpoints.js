// ─── Auth ──────────────────────────────────────────────────────────────────────
export const AUTH = {
  LOGIN:           '/auth/login',
  REGISTER:        '/auth/register',
  ME:              '/auth/me',
  CHANGE_PASSWORD: '/auth/change-password',
  SIGNATURE:       '/auth/signature',
  USERS:           '/auth/users',
  USER:            (id) => `/auth/users/${id}`,
  DEACTIVATE:      (id) => `/auth/users/${id}/deactivate`,
  REACTIVATE:      (id) => `/auth/users/${id}/reactivate`,
};

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export const DASHBOARD = {
  SUMMARY: '/dashboard',
};

// ─── Students ─────────────────────────────────────────────────────────────────
export const STUDENTS = {
  LIST:           '/students',
  BY_ID:          (id)     => `/students/${id}`,
  BY_NUMBER:      (num)    => `/students/by-number/${num}`,
  BY_PHONE:       '/students/by-phone',
  GROUP:          (groupId) => `/students/group/${groupId}`,
  GRADE_VIEW:     '/students/grade-view',
  PROMOTE:        '/students/promote',
  BULK_ENROL:     '/students/bulk-enrol',
  DEACTIVATE:     (id)     => `/students/${id}/deactivate`,
  ASSIGN_GROUP: '/students/assign-sibling-group',
  GRADUATED:      '/students/graduated',
  CLEAR_ARREARS:  (id)     => `/students/${id}/clear-arrears`,
};

// ─── Academic ─────────────────────────────────────────────────────────────────
export const ACADEMIC = {
  // Grades
  GRADES:         '/academic/grades',
  GRADE:          (id) => `/academic/grades/${id}`,
  // Years
  YEARS:          '/academic/years',
  ACTIVE_YEAR:    '/academic/years/active',
  SET_YEAR:       (id) => `/academic/years/${id}/set-active`,
  // Terms
  TERMS:          '/academic/terms',
  ACTIVE_TERM:    '/academic/terms/active',
  TERM:           (id) => `/academic/terms/${id}`,
  SET_TERM:       (id) => `/academic/terms/${id}/set-active`,
  TERM_MONTHS:    (termId) => `/academic/terms/${termId}/months`,
  // Fees
  TERM_FEES:      (termId) => `/academic/terms/${termId}/fees`,
  SET_FEE:        '/academic/fees',
  SET_MONTH_FEE:  '/academic/fees/month',
  STUDENT_FEE:    '/academic/fees/student',
  // Extension months
  EXTENSION_MONTHS:     (termId) => `/academic/terms/${termId}/extensions`,
  ADD_EXTENSION_MONTH:  '/academic/terms/extensions',
  EXTENSION_MONTH:      (id) => `/academic/terms/extensions/${id}`,
  TOGGLE_EXTENSION:     (id) => `/academic/terms/extensions/${id}/toggle`,
  SET_EXTENSION_FEE:    '/academic/terms/extensions/fees',
  REMOVE_EXTENSION_FEE: (extMonthId, gradeId) => `/academic/terms/extensions/${extMonthId}/fees/${gradeId}`,
};

// ─── Payments ─────────────────────────────────────────────────────────────────
export const TRANSFERS = {
  TRANSFERABLE_CREDITS: '/transfers/transferable-credits',
  TRANSFER:             '/transfers',
};
export const PAYMENTS = {
  CREATE:         '/payments',
  ELIGIBLE_ITEMS: '/payments/eligible-items',
  BY_ID:          (id) => `/payments/${id}`,
  EDIT:           (id) => `/payments/${id}`,
  DELETE:         (id) => `/payments/${id}`,
  BY_STUDENT:     (studentId) => `/payments/student/${studentId}`,
  RECEIPT:        (id) => `/payments/${id}/receipt`,
  RECEIPT_BY_NUM: (num) => `/payments/receipts/${num}`,
  MARK_PRINTED:   (id) => `/payments/${id}/mark-printed`,
  REVERSE:        '/payments/reverse',
  PAY_ARREARS:    '/payments/arrears',
  METHODS:        '/payments/methods',
  ZIG_RATE:       '/payments/zig-rate',
};

// ─── Fees ─────────────────────────────────────────────────────────────────────
export const FEES = {
  // Standalone settings
  REGISTRATION:   (yearId) => `/fees/registration/${yearId}`,
  SET_REGISTRATION: '/fees/registration',
  REPORT_BOOK:    (yearId) => `/fees/report-book/${yearId}`,
  SET_REPORT_BOOK: '/fees/report-book',
  ADMISSION:      (yearId) => `/fees/admission/${yearId}`,
  SET_ADMISSION:  '/fees/admission',
  TRANSPORT:      (yearId) => `/fees/transport/${yearId}`,
  SET_TRANSPORT:  '/fees/transport',
  PROJECT:        (yearId) => `/fees/project/${yearId}`,
  SET_PROJECT:    '/fees/project',
  // Uniforms
  UNIFORMS:       '/fees/uniforms',
  UNIFORM:        (id) => `/fees/uniforms/${id}`,
  // Trips
  TRIPS:          (termId) => `/fees/trips/${termId}`,
  TRIP:           (id) => `/fees/trips/${id}`,
  SET_TRIPS:      '/fees/trips',
  // Custom fees
  CUSTOM_FEES:    (termFeeId) => `/fees/custom/${termFeeId}`,
  CUSTOM_FEE:     (id) => `/fees/custom/${id}`,
  SET_CUSTOM_FEE: '/fees/custom',
  // Effective fee for a student
  EFFECTIVE:      '/fees/effective',
};

// ─── Expenses ─────────────────────────────────────────────────────────────────
export const EXPENSES = {
  LIST:           '/expenses',
  BY_ID:          (id) => `/expenses/${id}`,
  CATEGORIES:     '/expenses/categories',
};

// ─── Reports ─────────────────────────────────────────────────────────────────
export const REPORTS = {
  DAILY:             '/reports/daily',
  RANGE:             '/reports/range',
  ARREARS:           '/reports/arrears',
  TRANSPORT:         '/reports/transport',
  TRIPS:             '/reports/trips',
  TRANSFERS:         '/reports/transfers',
  UNIFORMS:          '/reports/uniforms',
  STANDALONE_FEES:   '/reports/standalone-fees',
  SCHOOL_SETTINGS:   '/reports/school-settings',
  STUDENT_STATEMENT: (id) => `/reports/student-statement/${id}`,
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const ADMIN = {
  AUDIT_LOGS:          '/admin/audit-logs',
  AUDIT_LOG_OPTIONS:   '/admin/audit-log-options',
  SETTINGS:            '/admin/settings',
  SETTING:             (key) => `/admin/settings/${key}`,
  PAYMENT_METHODS:     '/admin/payment-methods',
  PAYMENT_METHOD:      (id) => `/admin/payment-methods/${id}`,
  ZIG_RATE:            '/admin/zig-rate',
  ZIG_RATE_HISTORY:    '/admin/zig-rate/history',
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const NOTIFICATIONS = {
  ALL:        '/notifications',
  UNREAD:     '/notifications/unread',
  COUNT:      '/notifications/count',
  MARK_READ:  (id) => `/notifications/${id}/read`,
  READ_ALL:   '/notifications/read-all',
};

// ─── Fee Overrides ────────────────────────────────────────────────────────────
export const FEE_OVERRIDES = {
  GET:    '/fee-overrides',        // ?studentId=X&academicYearId=Y
  CREATE: '/fee-overrides',
  DELETE: (id) => `/fee-overrides/${id}`,
};
