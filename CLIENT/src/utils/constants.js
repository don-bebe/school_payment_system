// ─── Roles ────────────────────────────────────────────────────────────────────
export const ROLES = {
  ADMIN:        'Admin',
  RECEPTIONIST: 'Receptionist',
};
export const ROLE_OPTIONS = [
  { value: 'Admin',        label: 'Admin'        },
  { value: 'Receptionist', label: 'Receptionist' },
];

// ─── Currencies ───────────────────────────────────────────────────────────────
export const CURRENCIES = ['USD', 'ZIG'];
export const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD (US Dollar)' },
  { value: 'ZIG', label: 'ZIG (Zimbabwe Gold)' },
];

// ─── Gender ───────────────────────────────────────────────────────────────────
export const GENDER_OPTIONS = [
  { value: 'Male',   label: 'Male'   },
  { value: 'Female', label: 'Female' },
];

// ─── Payment status ───────────────────────────────────────────────────────────
export const PAYMENT_STATUSES = ['Completed', 'Reversed', 'Pending'];

// ─── Month status (per-breakdown cell) ────────────────────────────────────────
export const MONTH_STATUS = {
  PAID:    'Paid',
  PARTIAL: 'Partial',
  UNPAID:  'Unpaid',
};

// ─── Calendar months ──────────────────────────────────────────────────────────
export const MONTHS = [
  { value: 1,  label: 'January'   },
  { value: 2,  label: 'February'  },
  { value: 3,  label: 'March'     },
  { value: 4,  label: 'April'     },
  { value: 5,  label: 'May'       },
  { value: 6,  label: 'June'      },
  { value: 7,  label: 'July'      },
  { value: 8,  label: 'August'    },
  { value: 9,  label: 'September' },
  { value: 10, label: 'October'   },
  { value: 11, label: 'November'  },
  { value: 12, label: 'December'  },
];

// ─── Term numbers ─────────────────────────────────────────────────────────────
export const TERM_OPTIONS = [
  { value: 1, label: 'Term 1' },
  { value: 2, label: 'Term 2' },
  { value: 3, label: 'Term 3' },
];


// ─── Notification types ───────────────────────────────────────────────────────
export const NOTIFICATION_TYPES = {
  INFO:    'Info',
  WARNING: 'Warning',
  ALERT:   'Alert',
};

// ─── Routes ───────────────────────────────────────────────────────────────────
export const ROUTES = {
  LOGIN:            '/login',
  DASHBOARD:        '/',
  STUDENTS:         '/students',
  STUDENT:          (id) => `/students/${id}`,
  NEW_STUDENT:      '/students/new',
  ALUMNI:           '/students/alumni',
  PAYMENTS:         '/payments',
  NEW_PAYMENT:      '/payments/new',
  RECEIPT:          (id) => `/payments/${id}/receipt`,
  EXPENSES:         '/expenses',
  REPORTS:          '/reports',
  TRANSPORT_REPORT:       '/reports/transport',
  TRIP_REPORT:            '/reports/trips',
  TRANSFER_LOG:           '/reports/transfers',
  UNIFORM_REPORT:         '/reports/uniforms',
  STANDALONE_FEES_REPORT: '/reports/standalone-fees',
  ACADEMIC:         '/academic',
  ADMIN:            '/admin',
  PROFILE:          '/profile',
};

// ─── Page sizes ───────────────────────────────────────────────────────────────
export const PAGE_SIZES = [10, 20, 50, 100];
export const DEFAULT_PAGE_SIZE = 20;
