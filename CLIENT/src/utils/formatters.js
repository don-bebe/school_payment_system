// ─── Currency ─────────────────────────────────────────────────────────────────

/**
 * Format a decimal amount as a currency string.
 * formatCurrency(1500.5, 'USD') → "USD 1,500.50"
 * formatCurrency(3000,   'ZIG') → "ZIG 3,000.00"
 */
export function formatCurrency(amount, currency = 'USD') {
  const num = Number(amount ?? 0);
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
}

/**
 * Return a shorter display like "$1,500" (USD only, no decimals for whole amounts).
 */
export function formatCurrencyShort(amount, currency = 'USD') {
  const num = Number(amount ?? 0);
  const symbol = currency === 'USD' ? '$' : currency;
  return `${symbol}${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

// ─── Dates ────────────────────────────────────────────────────────────────────

/** "2026-03-04" → "04 Mar 2026" */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/** "2026-03-04T10:23:00Z" → "04 Mar 2026, 10:23" */
export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Returns "Today", "Yesterday", or formatted date */
export function formatRelativeDate(dateStr) {
  if (!dateStr) return '—';
  const d    = new Date(dateStr);
  const now  = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return formatDate(dateStr);
}

/** Input date value for <input type="date"> (YYYY-MM-DD) */
export function toInputDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().split('T')[0];
}

/** Today as YYYY-MM-DD */
export function todayInputDate() {
  return new Date().toISOString().split('T')[0];
}

// ─── Names ────────────────────────────────────────────────────────────────────

/** Capitalise first letter of each word */
export function titleCase(str = '') {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** "John", "Doe" → "J. Doe" */
export function abbreviateName(first, last) {
  return `${(first ?? '').charAt(0).toUpperCase()}. ${last ?? ''}`;
}

/** Full name from object with firstName / surname */
export function fullName(student) {
  if (!student) return '—';
  return `${student.firstName ?? ''} ${student.surname ?? student.lastName ?? ''}`.trim();
}

// ─── Numbers ─────────────────────────────────────────────────────────────────

/** 0.743 → "74.3%" */
export function formatPercent(value, decimals = 1) {
  return `${Number(value ?? 0).toFixed(decimals)}%`;
}

/** Pad a number to n digits: padNumber(42, 5) → "00042" */
export function padNumber(num, length = 5) {
  return String(num).padStart(length, '0');
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABELS = {
  Paid:      { label: 'Paid',      color: 'text-emerald-700 bg-emerald-100' },
  Partial:   { label: 'Partial',   color: 'text-amber-700  bg-amber-100'   },
  Unpaid:    { label: 'Unpaid',    color: 'text-red-700    bg-red-100'     },
  Completed: { label: 'Completed', color: 'text-emerald-700 bg-emerald-100' },
  Reversed:  { label: 'Reversed',  color: 'text-slate-600  bg-slate-100'  },
  Pending:   { label: 'Pending',   color: 'text-amber-700  bg-amber-100'  },
};

export function getStatusMeta(status) {
  return STATUS_LABELS[status] ?? { label: status, color: 'text-slate-600 bg-slate-100' };
}

// ─── String utils ─────────────────────────────────────────────────────────────

export function truncate(str, maxLen = 40) {
  if (!str) return '';
  return str.length > maxLen ? `${str.slice(0, maxLen)}…` : str;
}

/** Safe JSON parse — returns null on failure */
export function safeJson(str) {
  try { return JSON.parse(str); } catch { return null; }
}
