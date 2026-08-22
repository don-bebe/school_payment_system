import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks';
import { ROUTES } from '../utils/constants';

export default function ProtectedRoute({
  children,
  roles    = [],          // allowed roles, e.g. ['Admin']
  fallback = ROUTES.DASHBOARD, // where to redirect on denial — null means render nothing
}) {
  const { role, isAuth } = useAuth();

  // Not authenticated at all
  if (!isAuth) return <Navigate to={ROUTES.LOGIN} replace />;

  // No role restriction — all authenticated users pass
  if (roles.length === 0) return children;

  // Role check
  if (roles.includes(role)) return children;

  // No permission
  if (fallback === null) return null;
  return <Navigate to={fallback} replace />;
}