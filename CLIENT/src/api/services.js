import api from './apiConfig';
import { AUTH, DASHBOARD, STUDENTS, ACADEMIC, PAYMENTS, FEES, EXPENSES, REPORTS, ADMIN, NOTIFICATIONS, TRANSFERS, FEE_OVERRIDES } from './endpoints';

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login:          (data)     => api.post(AUTH.LOGIN, data),
  register:       (data)     => api.post(AUTH.REGISTER, data),
  me:             ()         => api.get(AUTH.ME),
  changePassword: (data)     => api.put(AUTH.CHANGE_PASSWORD, data),
  saveSignature:  (data)     => api.put(AUTH.SIGNATURE, data),
  getUsers:       ()         => api.get(AUTH.USERS),
  getUser:        (id)       => api.get(AUTH.USER(id)),
  deactivate:     (id)       => api.put(AUTH.DEACTIVATE(id)),
  reactivate:     (id)       => api.put(AUTH.REACTIVATE(id)),
};

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getSummary: () => api.get(DASHBOARD.SUMMARY),
};

// ─── Students ─────────────────────────────────────────────────────────────────
export const studentsApi = {
  search:              (params)           => api.get(STUDENTS.LIST, { params }),
  getById:             (id)               => api.get(STUDENTS.BY_ID(id)),
  getByNumber:         (num)              => api.get(STUDENTS.BY_NUMBER(num)),
  getGroup:            (groupId, yearId)  => api.get(STUDENTS.GROUP(groupId), { params: { academicYearId: yearId } }),
  findByPhone:         (phone, yearId)    => api.get(STUDENTS.BY_PHONE, { params: { phone, academicYearId: yearId } }),
  create:              (data)             => api.post(STUDENTS.LIST, data),
  update:              (id, data)         => api.put(STUDENTS.BY_ID(id), data),
  deactivateWithReason:(id, data)         => api.put(STUDENTS.DEACTIVATE(id), data),
  bulkEnrol:           (data)             => api.post(STUDENTS.BULK_ENROL, data),
  gradeView:           (params)           => api.get(STUDENTS.GRADE_VIEW, { params }),
  promote:             (data)             => api.post(STUDENTS.PROMOTE, data),
  assignSiblingGroup:  (ids)              => api.post(STUDENTS.ASSIGN_GROUP, ids),
  getGraduated:        ()                 => api.get(STUDENTS.GRADUATED),
  clearArrears:        (id, data)         => api.post(STUDENTS.CLEAR_ARREARS(id), data),
};

// ─── Academic ─────────────────────────────────────────────────────────────────
export const academicApi = {
  // Grades
  getGrades:    ()      => api.get(ACADEMIC.GRADES),
  createGrade:  (data)  => api.post(ACADEMIC.GRADES, data),
  updateGrade:  (id, d) => api.put(ACADEMIC.GRADE(id), d),
  // Years
  getYears:     ()      => api.get(ACADEMIC.YEARS),
  getAll:       ()      => api.get(ACADEMIC.YEARS),           // alias used in TransferCreditPage
  getActiveYear:()      => api.get(ACADEMIC.ACTIVE_YEAR),
  createYear:   (data)  => api.post(ACADEMIC.YEARS, data),
  setActiveYear:(id)    => api.put(ACADEMIC.SET_YEAR(id)),
  // Terms
  getTerms:        (yearId) => api.get(ACADEMIC.TERMS, { params: { academicYearId: yearId } }),
  getTermsByYear:  (yearId) => api.get(ACADEMIC.TERMS, { params: { academicYearId: yearId } }), // alias
  getActiveTerm:   ()       => api.get(ACADEMIC.ACTIVE_TERM),
  createTerm:      (data)   => api.post(ACADEMIC.TERMS, data),
  updateTerm:      (id, d)  => api.put(ACADEMIC.TERM(id), d),
  setActiveTerm:   (id)     => api.put(ACADEMIC.SET_TERM(id)),
  getTermMonths:   (termId) => api.get(ACADEMIC.TERM_MONTHS(termId)),
  // Fees
  getTermFees:    (termId) => api.get(ACADEMIC.TERM_FEES(termId)),
  setFee:         (data)   => api.post(ACADEMIC.SET_FEE, data),
  setMonthFee:    (data)   => api.post(ACADEMIC.SET_MONTH_FEE, data),
  deleteMonthFee: (termFeeId, termMonthId) =>
    api.delete(ACADEMIC.SET_MONTH_FEE, { params: { termFeeId, termMonthId } }),
  getStudentFee:  (params)  => api.get(ACADEMIC.STUDENT_FEE, { params }),
  // Extension months
  getExtensionMonths:   (termId)             => api.get(ACADEMIC.EXTENSION_MONTHS(termId)),
  addExtensionMonth:    (data)               => api.post(ACADEMIC.ADD_EXTENSION_MONTH, data),
  removeExtensionMonth: (id)                 => api.delete(ACADEMIC.EXTENSION_MONTH(id)),
  toggleExtensionMonth: (id, isActive)       => api.put(ACADEMIC.TOGGLE_EXTENSION(id), null, { params: { isActive } }),
  setExtensionFee:      (data)               => api.post(ACADEMIC.SET_EXTENSION_FEE, data),
  removeExtensionFee:   (extMonthId, gradeId) => api.delete(ACADEMIC.REMOVE_EXTENSION_FEE(extMonthId, gradeId)),
};

// ─── Payments ─────────────────────────────────────────────────────────────────
export const paymentsApi = {
  create:          (data)   => api.post(PAYMENTS.CREATE, data),
  getEligibleItems:(params) => api.get(PAYMENTS.ELIGIBLE_ITEMS, { params }),
  getById:         (id)     => api.get(PAYMENTS.BY_ID(id)),
  edit:            (id, d)  => api.put(PAYMENTS.EDIT(id), d),
  delete:          (id, reason) => api.delete(PAYMENTS.DELETE(id), { params: { reason } }),
  getByStudent:    (id, p)  => api.get(PAYMENTS.BY_STUDENT(id), { params: p }),
  getReceipt:      (id)     => api.get(PAYMENTS.RECEIPT(id)),
  getReceiptByNum: (num)    => api.get(PAYMENTS.RECEIPT_BY_NUM(num)),
  markPrinted:     (id)     => api.put(PAYMENTS.MARK_PRINTED(id)),
  reverse:         (data)   => api.post(PAYMENTS.REVERSE, data),
  getMethods:      ()       => api.get(PAYMENTS.METHODS),
  getZigRate:      ()       => api.get(PAYMENTS.ZIG_RATE),
  payArrears:      (data)   => api.post(PAYMENTS.PAY_ARREARS, data),
};

// ─── Fee Overrides ─────────────────────────────────────────────────────────────
export const feeOverridesApi = {
  get:    (studentId, academicYearId) =>
    api.get(FEE_OVERRIDES.GET, { params: { studentId, academicYearId } }),
  create: (data) => api.post(FEE_OVERRIDES.CREATE, data),
  delete: (id)   => api.delete(FEE_OVERRIDES.DELETE(id)),
};

// ─── Fees (standalone config) ─────────────────────────────────────────────────
export const feesApi = {
  // Effective fee for a student
  getEffective:       (params) => api.get(FEES.EFFECTIVE, { params }),
  // Standalone settings (GET)
  getRegistration:    (yearId) => api.get(FEES.REGISTRATION(yearId)),
  getReportBook:      (yearId) => api.get(FEES.REPORT_BOOK(yearId)),
  getAdmission:       (yearId) => api.get(FEES.ADMISSION(yearId)),
  getTransport:       (yearId) => api.get(FEES.TRANSPORT(yearId)),
  getProject:         (yearId) => api.get(FEES.PROJECT(yearId)),
  // Standalone settings (SET)
  setRegistration:    (data)   => api.post(FEES.SET_REGISTRATION, data),
  setReportBook:      (data)   => api.post(FEES.SET_REPORT_BOOK, data),
  setAdmission:       (data)   => api.post(FEES.SET_ADMISSION, data),
  setTransport:       (data)   => api.post(FEES.SET_TRANSPORT, data),
  setProject:         (data)   => api.post(FEES.SET_PROJECT, data),
  // Uniforms
  getUniforms:        (p)      => api.get(FEES.UNIFORMS, { params: p }),
  createUniform:      (data)   => api.post(FEES.UNIFORMS, data),
  updateUniform:      (id, d)  => api.put(FEES.UNIFORM(id), d),
  // Trips
  getTrips:           (termId, p) => api.get(FEES.TRIPS(termId), { params: p }),
  createTrip:         (data)   => api.post(FEES.SET_TRIPS, data),
  updateTrip:         (id, d)  => api.put(FEES.TRIP(id), d),
  // Custom fees
  getCustomFees:      (termFeeId) => api.get(FEES.CUSTOM_FEES(termFeeId)),
  createCustomFee:    (data)   => api.post(FEES.SET_CUSTOM_FEE, data),
  updateCustomFee:    (id, d)  => api.put(FEES.CUSTOM_FEE(id), d),
  deleteCustomFee:    (id)     => api.delete(FEES.CUSTOM_FEE(id)),
};

// ─── Expenses ─────────────────────────────────────────────────────────────────
export const expensesApi = {
  getByRange:     (params)  => api.get(EXPENSES.LIST, { params }),
  getById:        (id)      => api.get(EXPENSES.BY_ID(id)),
  create:         (data)    => api.post(EXPENSES.LIST, data),
  update:         (id, d)   => api.put(EXPENSES.BY_ID(id), d),
  delete:         (id)      => api.delete(EXPENSES.BY_ID(id)),
  getCategories:  ()        => api.get(EXPENSES.CATEGORIES),
  createCategory: (data)    => api.post(EXPENSES.CATEGORIES, data),
};

// ─── Reports ─────────────────────────────────────────────────────────────────
export const reportsApi = {
  getDaily:            (params)              => api.get(REPORTS.DAILY,             { params }),
  getRange:            (params)              => api.get(REPORTS.RANGE,             { params }),
  getArrears:          (params)              => api.get(REPORTS.ARREARS,           { params }),
  getTransport:        (params)              => api.get(REPORTS.TRANSPORT,         { params }),
  getTrips:            (params)              => api.get(REPORTS.TRIPS,             { params }),
  getTransfers:        (params)              => api.get(REPORTS.TRANSFERS,         { params }),
  getUniforms:         (params)              => api.get(REPORTS.UNIFORMS,          { params }),
  getStudentStatement: (studentId, yearId)   => api.get(REPORTS.STUDENT_STATEMENT(studentId), { params: { academicYearId: yearId } }),
  getStandaloneFees:   (academicYearId, feeType) => api.get(REPORTS.STANDALONE_FEES, { params: { academicYearId, feeType } }),
  getSchoolSettings:   ()                    => api.get(REPORTS.SCHOOL_SETTINGS),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminApi = {
  getAuditLogs:         (params) => api.get(ADMIN.AUDIT_LOGS, { params }),
  getAuditLogOptions:   ()       => api.get(ADMIN.AUDIT_LOG_OPTIONS),
  getSettings:          ()       => api.get(ADMIN.SETTINGS),
  getSetting:           (key)    => api.get(ADMIN.SETTING(key)),
  upsertSetting:        (data)   => api.put(ADMIN.SETTINGS, data),
  getPaymentMethods:    ()       => api.get(ADMIN.PAYMENT_METHODS),
  createPaymentMethod:  (data)   => api.post(ADMIN.PAYMENT_METHODS, data),
  updatePaymentMethod:  (id, d)  => api.put(ADMIN.PAYMENT_METHOD(id), d),
  getZigRate:           ()       => api.get(ADMIN.ZIG_RATE),
  getZigRateHistory:    ()       => api.get(ADMIN.ZIG_RATE_HISTORY),
  setZigRate:           (data)   => api.post(ADMIN.ZIG_RATE, data),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationsApi = {
  getAll:     ()   => api.get(NOTIFICATIONS.ALL),
  getUnread:  ()   => api.get(NOTIFICATIONS.UNREAD),
  getCount:   ()   => api.get(NOTIFICATIONS.COUNT),
  markRead:   (id) => api.put(NOTIFICATIONS.MARK_READ(id)),
  markAllRead:()   => api.put(NOTIFICATIONS.READ_ALL),
};

// ─── Transfers ────────────────────────────────────────────────────────────────
export const transfersApi = {
  getTransferableCredits: (params) => api.get(TRANSFERS.TRANSFERABLE_CREDITS, { params }),
  transfer:               (data)   => api.post(TRANSFERS.TRANSFER, data),
};
