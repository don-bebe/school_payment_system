import { getStatusMeta } from '../../utils/formatters';

// ─── Badge ────────────────────────────────────────────────────────────────────
const BADGE_VARIANTS = {
  blue:    'bg-blue-100   text-blue-800',
  green:   'bg-emerald-100 text-emerald-800',
  red:     'bg-red-100    text-red-800',
  yellow:  'bg-amber-100  text-amber-800',
  slate:   'bg-slate-100  text-slate-700',
  purple:  'bg-purple-100 text-purple-800',
  orange:  'bg-orange-100 text-orange-800',
};

const BADGE_SIZES = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2   py-0.5 text-xs',
  lg: 'px-2.5 py-1   text-sm',
};

export function Badge({ children, variant = 'slate', size = 'md', className = '' }) {
  return (
    <span
      className={[
        'inline-flex items-center font-medium rounded-full',
        BADGE_VARIANTS[variant] ?? BADGE_VARIANTS.slate,
        BADGE_SIZES[size]       ?? BADGE_SIZES.md,
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
// Reads the color from the formatters utility.
export function StatusBadge({ status, size = 'md' }) {
  const { label, color } = getStatusMeta(status);
  return (
    <span
      className={[
        'inline-flex items-center font-medium rounded-full px-2 py-0.5 text-xs',
        color,
      ].join(' ')}
    >
      {label}
    </span>
  );
}

// ─── RoleBadge ───────────────────────────────────────────────────────────────
const ROLE_COLORS = {
  Admin:        'blue',
  Receptionist: 'green',
  Clerk:        'purple',
};

export function RoleBadge({ role }) {
  return <Badge variant={ROLE_COLORS[role] ?? 'slate'}>{role}</Badge>;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
const AVATAR_SIZES = {
  xs:  'w-6  h-6  text-xs',
  sm:  'w-8  h-8  text-sm',
  md:  'w-10 h-10 text-sm',
  lg:  'w-12 h-12 text-base',
  xl:  'w-16 h-16 text-xl',
};

const AVATAR_COLORS = [
  'bg-blue-500',   'bg-emerald-500', 'bg-violet-500',
  'bg-amber-500',  'bg-rose-500',    'bg-cyan-500',
];

function getAvatarColor(name = '') {
  const sum = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

/**
 * Shows a coloured circle with initials derived from `name`.
 * If `src` is provided, shows an image instead.
 */
export function Avatar({ name = '', src, size = 'md', className = '' }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const color = getAvatarColor(name);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={['rounded-full object-cover', AVATAR_SIZES[size], className].join(' ')}
      />
    );
  }

  return (
    <div
      className={[
        'rounded-full flex items-center justify-center text-white font-semibold select-none',
        AVATAR_SIZES[size] ?? AVATAR_SIZES.md,
        color,
        className,
      ].join(' ')}
      aria-label={name}
    >
      {initials || '?'}
    </div>
  );
}
