import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks';
import { logout, selectIsAuth, selectCurrentUser } from '../store/slices/authSlice';
import { ROUTES } from '../utils/constants';
import AppLayout from '../layout/AppLayout';
import { PageLoader } from '../components/feedback/Loading';

// ─── Lazy-loaded pages ────────────────────────────────────────────────────────
const LoginPage         = lazy(() => import('../pages/auth/LoginPage'));
const DashboardPage     = lazy(() => import('../pages/DashboardPage'));
const StudentsPage      = lazy(() => import('../pages/students/StudentsPage'));
const StudentDetailPage = lazy(() => import('../pages/students/StudentDetailPage'));
const NewStudentPage    = lazy(() => import('../pages/students/NewStudentPage'));
const EditStudentPage   = lazy(() => import('../pages/students/EditStudentPage'));
const GradeViewPage     = lazy(() => import('../pages/students/GradeViewPage'));
const BulkEnrolPage     = lazy(() => import('../pages/students/BulkEnrolPage'));
const AlumniPage        = lazy(() => import('../pages/students/AlumniPage'));
const PaymentsPage      = lazy(() => import('../pages/payments/PaymentsPage'));
const NewPaymentPage    = lazy(() => import('../pages/payments/NewPaymentPage'));
const ReceiptPage       = lazy(() => import('../pages/payments/ReceiptPage'));
const EditPaymentPage   = lazy(() => import('../pages/payments/EditPaymentPage'));
const TransferCreditPage = lazy(() => import('../pages/payments/TransferCreditPage'));
const ExpensesPage      = lazy(() => import('../pages/expenses/ExpensesPage'));
const ReportsPage       = lazy(() => import('../pages/reports/ReportsPage'));
const TransportReportPage = lazy(() => import('../pages/reports/TransportReportPage'));
const TripReportPage    = lazy(() => import('../pages/reports/TripReportPage'));
const TransferLogPage   = lazy(() => import('../pages/reports/TransferLogPage'));
const UniformSalesPage  = lazy(() => import('../pages/reports/UniformSalesPage'));
const StandaloneFeesPage = lazy(() => import('../pages/reports/StandaloneFeesPage'));
const StudentStatementPage = lazy(() => import('../pages/reports/StudentStatementPage'));
const AcademicPage      = lazy(() => import('../pages/academic/AcademicPage'));
const AdminPage         = lazy(() => import('../pages/admin/AdminPage'));
const ProfilePage       = lazy(() => import('../pages/profile/ProfilePage'));
const NotFoundPage      = lazy(() => import('../pages/NotFoundPage'));

// ─── Guards ───────────────────────────────────────────────────────────────────

/** Redirect to login if not authenticated */
function RequireAuth() {
  const isAuth = useAppSelector(selectIsAuth);
  return isAuth ? <Outlet /> : <Navigate to={ROUTES.LOGIN} replace />;
}

/** Redirect to dashboard if already logged in */
function RequireGuest() {
  const isAuth = useAppSelector(selectIsAuth);
  return isAuth ? <Navigate to={ROUTES.DASHBOARD} replace /> : <Outlet />;
}

/** Only Admin can access */
function RequireAdmin() {
  const user = useAppSelector(selectCurrentUser);
  return user?.role === 'Admin' ? <Outlet /> : <Navigate to={ROUTES.DASHBOARD} replace />;
}

// ─── Router ───────────────────────────────────────────────────────────────────
export default function AppRouter() {
  const dispatch = useAppDispatch();

  // Global 401 listener — apiConfig fires this when the JWT expires
  useEffect(() => {
    const handle = () => dispatch(logout());
    window.addEventListener('auth:logout', handle);
    return () => window.removeEventListener('auth:logout', handle);
  }, [dispatch]);

  return (
    <HashRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* ── Guest-only ─────────────────────────────────────────── */}
          <Route element={<RequireGuest />}>
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          </Route>

          {/* ── Authenticated layout ────────────────────────────────── */}
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>

              {/* Dashboard */}
              <Route index element={<DashboardPage />} />

              {/* Students */}
              <Route path="students">
                <Route index  element={<StudentsPage />} />
                <Route path="new"          element={<NewStudentPage />} />
                <Route path="grade-view"   element={<GradeViewPage />} />
                <Route path="bulk-enrol"   element={<BulkEnrolPage />} />
                <Route path="alumni"       element={<AlumniPage />} />
                <Route path=":id"          element={<StudentDetailPage />} />
                <Route path=":id/edit"     element={<EditStudentPage />} />
              </Route>

              {/* Payments */}
              <Route path="payments">
                <Route index  element={<PaymentsPage />} />
                <Route path="new"             element={<NewPaymentPage />} />
                <Route path=":id/receipt"     element={<ReceiptPage />} />
                <Route path=":id/edit"        element={<EditPaymentPage />} />
                <Route path="transfer-credit" element={<TransferCreditPage />} />
              </Route>

              <Route path="expenses" element={<ExpensesPage />} />
              {/* Reports */}
              <Route path="reports" element={<ReportsPage />} />
              <Route path="reports/transport" element={<TransportReportPage />} />
              <Route path="reports/trips"     element={<TripReportPage />} />
              <Route path="reports/transfers" element={<TransferLogPage />} />
              <Route path="reports/uniforms"  element={<UniformSalesPage />} />
              <Route path="reports/standalone-fees" element={<StandaloneFeesPage />} />
              <Route path="reports/statement/:id" element={<StudentStatementPage />} />

              {/* Academic setup — Fee Config tab is inside this page (Admin only sees it) */}
              <Route path="academic" element={<AcademicPage />} />

              {/* Admin — Admin role only */}
              <Route element={<RequireAdmin />}>
                <Route path="admin" element={<AdminPage />} />
              </Route>

              {/* Profile */}
              <Route path="profile" element={<ProfilePage />} />

            </Route>
          </Route>

          {/* ── Fallback ────────────────────────────────────────────── */}
          <Route path="*" element={<NotFoundPage />} />

        </Routes>
      </Suspense>
    </HashRouter>
  );
}
