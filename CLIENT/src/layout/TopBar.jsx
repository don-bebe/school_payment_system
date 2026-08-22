import { useEffect, useRef, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faUser } from '@fortawesome/free-solid-svg-icons';
import { useAppDispatch, useAppSelector, useAuth, usePolling } from '../hooks';
import { fetchUnreadCount, markAllRead, fetchNotifications, selectUnreadCount, selectNotifications } from '../store/slices/notificationsSlice';
import { selectIsAuth } from '../store/slices/authSlice';
import { formatRelativeDate } from '../utils/formatters';
import { ROUTES } from '../utils/constants';

// ─── Breadcrumb ───────────────────────────────────────────────────────────────
const ROUTE_NAMES = {
  '':          'Dashboard',
  'students':  'Students',
  'payments':  'Payments',
  'expenses':  'Expenses',
  'reports':   'Reports',
  'academic':  'Academic',
  'admin':     'Admin',
  'profile':   'Profile',
  'new':       'New',
  'edit':      'Edit',
  'receipt':   'Receipt',
  'grade-view':'Grade View',
};

function Breadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <Link to="/" className="text-slate-400 hover:text-slate-600 transition-colors">Home</Link>
      {segments.map((seg, i) => {
        const path  = '/' + segments.slice(0, i + 1).join('/');
        const label = ROUTE_NAMES[seg] ?? (isNaN(seg) ? seg : `#${seg}`);
        const isLast = i === segments.length - 1;
        return (
          <span key={path} className="flex items-center gap-1.5">
            <span className="text-slate-300">/</span>
            {isLast
              ? <span className="text-slate-700 font-medium">{label}</span>
              : <Link to={path} className="text-slate-400 hover:text-slate-600 transition-colors">{label}</Link>
            }
          </span>
        );
      })}
    </nav>
  );
}

// ─── Notification Bell ────────────────────────────────────────────────────────
function NotificationBell() {
  const dispatch      = useAppDispatch();
  const count         = useAppSelector(selectUnreadCount);
  const notifications = useAppSelector(selectNotifications);
  const isAuth        = useAppSelector(selectIsAuth);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Only poll when authenticated — prevents 401 errors on the login screen
  usePolling(() => dispatch(fetchUnreadCount()), 60000, isAuth);

  useEffect(() => {
    if (open) dispatch(fetchNotifications());
  }, [open, dispatch]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const TYPE_COLOR = { Info: 'bg-blue-100', Warning: 'bg-amber-100', Alert: 'bg-red-100' };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
      >
        <FontAwesomeIcon icon={faBell} />
        {count > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-sm text-slate-800">Notifications</h3>
            {count > 0 && (
              <button
                onClick={() => dispatch(markAllRead())}
                className="text-xs text-blue-500 hover:text-blue-700 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No notifications</p>
            ) : notifications.map(n => (
              <div
                key={n.id}
                className={['px-4 py-3 text-sm flex gap-3', !n.isRead ? 'bg-blue-50/40' : ''].join(' ')}
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.isRead ? 'bg-blue-500' : 'bg-slate-200'}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{n.title}</p>
                  <p className="text-slate-500 text-xs mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-slate-400 text-xs mt-1">{formatRelativeDate(n.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────
export default function TopBar() {
  const { user } = useAuth();
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4 flex-shrink-0">
      <div className="flex-1 min-w-0">
        <Breadcrumb />
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <Link
          to={ROUTES.PROFILE}
          className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
        >
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
            <FontAwesomeIcon icon={faUser} className="text-blue-600 text-xs" />
          </div>
          <span className="text-sm font-medium hidden sm:block">{user?.firstName}</span>
        </Link>
      </div>
    </header>
  );
}
