// ─── Primitives ───────────────────────────────────────────────────────────────
export const required  = (v)           => (!v && v !== 0 ? 'This field is required.' : null);
export const minLen    = (n) => (v)    => (v && v.length < n  ? `Minimum ${n} characters.`  : null);
export const maxLen    = (n) => (v)    => (v && v.length > n  ? `Maximum ${n} characters.`  : null);
export const minVal    = (n) => (v)    => (Number(v) < n      ? `Must be at least ${n}.`     : null);
export const maxVal    = (n) => (v)    => (Number(v) > n      ? `Must be at most ${n}.`      : null);
export const isEmail   = (v)           => (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Invalid email address.' : null);
export const isNumeric = (v)           => (v !== '' && isNaN(Number(v)) ? 'Must be a number.' : null);
export const isPositive= (v)           => (Number(v) <= 0 ? 'Must be greater than zero.' : null);
export const isPhone   = (v)           => (v && !/^[+\d\s\-()]{7,15}$/.test(v) ? 'Invalid phone number.' : null);

// ─── Password ─────────────────────────────────────────────────────────────────
export function validatePassword(pwd) {
  if (!pwd)               return 'Password is required.';
  if (pwd.length < 8)     return 'Minimum 8 characters.';
  if (!/[A-Z]/.test(pwd)) return 'Must contain an uppercase letter.';
  if (!/\d/.test(pwd))    return 'Must contain a digit.';
  return null;
}

export function validatePasswordMatch(pwd, confirm) {
  return pwd !== confirm ? 'Passwords do not match.' : null;
}

// ─── Compose multiple rules ───────────────────────────────────────────────────
// Usage: compose(required, minLen(3), isEmail)(value)
export function compose(...rules) {
  return (value) => {
    for (const rule of rules) {
      const err = rule(value);
      if (err) return err;
    }
    return null;
  };
}

// ─── Form-level validation ────────────────────────────────────────────────────
/**
 * Validate an entire form object against a schema.
 *
 * schema = { fieldName: validatorFn | validatorFn[] }
 * Returns { fieldName: 'error message' | null }
 *
 * Usage:
 *   const errors = validateForm(formData, {
 *     email:    [required, isEmail],
 *     password: [required, validatePassword],
 *   });
 *   const isValid = Object.values(errors).every(e => !e);
 */
export function validateForm(values, schema) {
  const errors = {};
  for (const [field, rules] of Object.entries(schema)) {
    const ruleArray  = Array.isArray(rules) ? rules : [rules];
    const validator  = compose(...ruleArray);
    errors[field]    = validator(values[field]);
  }
  return errors;
}

// ─── Domain-specific ─────────────────────────────────────────────────────────
export function validateLoginForm(values) {
  return validateForm(values, {
    email:    [required, isEmail],
    password: [required],
  });
}

export function validateRegisterForm(values) {
  return validateForm(values, {
    firstName: [required, minLen(2)],
    lastName:  [required, minLen(2)],
    email:     [required, isEmail],
    password:  [required, validatePassword],
    role:      [required],
  });
}

export function validateStudentForm(values) {
  return validateForm(values, {
    firstName:     [required, minLen(2)],
    surname:       [required, minLen(2)],
    dateOfBirth:   [required],
    gender:        [required],
    guardianName:  [required],
    guardianPhone: [required, isPhone],
    gradeId:       [required],
    academicYearId:[required],
  });
}

export function validatePaymentForm(values) {
  return validateForm(values, {
    studentId:       [required],
    termId:          [required],
    academicYearId:  [required],
    paymentMethodId: [required],
    amountPaid:      [required, isNumeric, isPositive],
    currency:        [required],
  });
}

export function validateExpenseForm(values) {
  return validateForm(values, {
    description:       [required],
    amount:            [required, isNumeric, isPositive],
    currency:          [required],
    categoryId:        [required],
    paymentMethodId:   [required],
    expenseDate:       [required],
  });
}
