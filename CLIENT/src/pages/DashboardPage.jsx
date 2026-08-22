import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserGraduate, faMoneyBillWave, faChartLine,
  faTriangleExclamation, faArrowRight, faClock,
} from '@fortawesome/free-solid-svg-icons';

import { useAppDispatch, useAppSelector } from '../hooks';
import { fetchDashboard, selectDashboard, selectDashboardLoading } from '../store/slices/dashboardSlice';
import { StatCard, Card, CardHeader, ProgressBar, SectionHeader } from '../components/ui/Card';
import { SkeletonCard } from '../components/feedback/Loading';
import { formatCurrency, formatDate } from '../utils/formatters';
import { ROUTES } from '../utils/constants';
import Button from '../components/ui/Button';

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const summary  = useAppSelector(selectDashboard);
  const loading  = useAppSelector(selectDashboardLoading);
  const navigate = useNavigate();

  useEffect(() => { dispatch(fetchDashboard()); }, [dispatch]);

  if (loading && !summary) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const s = summary;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Dashboard"
        subtitle={
          !s ? 'Loading…'
          : s.activeAcademicYear && s.activeTermName
            ? `${s.activeAcademicYear} — ${s.activeTermName}`
            : 'No active term configured'
        }
        actions={
          <Button size="sm" onClick={() => dispatch(fetchDashboard())} variant="secondary">
            Refresh
          </Button>
        }
      />

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={s?.activeStudents ?? '—'}
          icon={faUserGraduate}
          iconColor="text-blue-600" iconBg="bg-blue-50"
        />
        <StatCard
          title="USD Collected"
          value={s?.totalFeesCollected ?? 0}
          currency="USD"
          icon={faMoneyBillWave}
          iconColor="text-emerald-600" iconBg="bg-emerald-50"
        />
        <StatCard
          title="Today's Income"
          value={s?.todayIncomeUsd ?? 0}
          currency="USD"
          icon={faChartLine}
          iconColor="text-violet-600" iconBg="bg-violet-50"
        />
        <StatCard
          title="Students with Arrears"
          value={s?.studentsWithArrears ?? '—'}
          icon={faTriangleExclamation}
          iconColor="text-red-500" iconBg="bg-red-50"
        />
      </div>

      {/* ── Fee collection progress + today breakdown ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Collection rate */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Term Fee Collection"
            subtitle={s?.activeTermName ? `${s.activeTermName} — target vs collected` : 'No active term — configure one in Academic'}
            action={
              <Button size="xs" variant="ghost" iconRight={faArrowRight}
                onClick={() => navigate(ROUTES.REPORTS)}>
                Full report
              </Button>
            }
          />
          <div className="space-y-4">
            {/* Overall bar (cash + in-kind) */}
            <ProgressBar
              value={s?.totalFeesCollected ?? 0}
              max={s?.totalFeesExpected  || 1}
              label="Collected (all)"
              color={
                !s?.totalFeesExpected      ? 'bg-slate-300'
                : s?.collectionRate >= 80  ? 'bg-emerald-500'
                : s?.collectionRate >= 50  ? 'bg-amber-400'
                : 'bg-red-400'
              }
            />
            {/* Cash-only bar */}
            {(s?.prepaymentTotal ?? 0) > 0 && (
              <ProgressBar
                value={s?.cashFeesCollected ?? 0}
                max={s?.totalFeesExpected  || 1}
                label="Cash collected"
                color="bg-blue-500"
              />
            )}
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'Expected',    value: formatCurrency(s?.totalFeesExpected,    'USD') },
                { label: 'Cash Rcvd',   value: formatCurrency(s?.cashFeesCollected,    'USD') },
                { label: 'Outstanding', value: formatCurrency(s?.totalFeesOutstanding, 'USD'), red: true },
              ].map(({ label, value, red }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className={`text-sm font-bold ${red ? 'text-red-600' : 'text-slate-800'}`}>{value}</p>
                </div>
              ))}
            </div>
            {/* In-kind summary strip */}
            {(s?.prepaymentTotal ?? 0) > 0 && (
              <div className="flex items-center justify-between text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <span className="text-amber-700 font-medium">
                  In-Kind Contributions ({s.prepaymentCount} transaction{s.prepaymentCount !== 1 ? 's' : ''})
                </span>
                <span className="font-bold text-amber-700">{formatCurrency(s.prepaymentTotal, 'USD')}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Today's payment methods */}
        <Card>
          <CardHeader title="Today by Method" subtitle={`${s?.todayPaymentCount ?? 0} transactions`} />
          <div className="space-y-3">
            {s?.todayByMethod?.length > 0 ? s.todayByMethod.map((m, i) => (
              <div key={`${m.code}-${i}`} className={[
                'flex items-center justify-between text-sm rounded-lg px-2 py-1',
                m.isPrepayment ? 'bg-amber-50' : '',
              ].join(' ')}>
                <div>
                  <span className={m.isPrepayment ? 'text-amber-700 font-medium' : 'text-slate-600 font-medium'}>
                    {m.methodName}
                  </span>
                  {m.isPrepayment && (
                    <span className="ml-1.5 text-xs text-amber-500 font-normal">(in-kind)</span>
                  )}
                </div>
                <span className={`font-semibold ${m.isPrepayment ? 'text-amber-600' : 'text-slate-800'}`}>
                  {formatCurrency(m.total, 'USD')}
                </span>
              </div>
            )) : (
              <p className="text-sm text-slate-400 text-center py-4">No payments today</p>
            )}
            {/* Totals — each currency shown separately, never mixed */}
            <div className="border-t border-slate-100 pt-3 space-y-1.5">
              {(s?.todayPrepayment ?? 0) > 0 && (
                <div className="flex justify-between text-xs text-amber-600">
                  <span>In-Kind Contributions</span>
                  <span className="font-semibold">{formatCurrency(s.todayPrepayment, 'USD')}</span>
                </div>
              )}
              {(s?.todayIncomeZig ?? 0) > 0 && (
                <div className="flex justify-between text-xs text-slate-600">
                  <span>💴 ZIG Cash Received</span>
                  <span className="font-semibold">{formatCurrency(s.todayIncomeZig, 'ZIG')}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-700">💵 USD Cash In Hand</span>
                <span className={s?.todayIncomeUsd >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                  {formatCurrency(s?.todayIncomeUsd ?? 0, 'USD')}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-slate-100 pt-1.5">
                <span className="text-slate-700">Net USD Balance</span>
                <span className={s?.todayBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                  {formatCurrency(s?.todayBalance ?? 0, 'USD')}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Recent payments ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Recent Payments"
          subtitle="Last 10 transactions"
          action={
            <Button size="xs" variant="ghost" iconRight={faArrowRight}
              onClick={() => navigate(ROUTES.PAYMENTS)}>
              View all
            </Button>
          }
        />
        {s?.recentPayments?.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {s.recentPayments.map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-5 px-5 cursor-pointer rounded-lg transition-colors"
                onClick={() => navigate(`/payments/${p.id}/receipt`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <FontAwesomeIcon icon={faMoneyBillWave} className="text-blue-400 text-sm" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{p.studentName}</p>
                    <p className="text-xs text-slate-400">
                      {p.studentNumber} · {p.method}
                      {p.methodCode === 'PREPAYMENT' && (
                        <span className="ml-1.5 text-amber-500 font-medium">(in-kind)</span>
                      )}
                    </p>
                    {p.prepaymentDescription && (
                      <p className="text-xs text-amber-600 italic truncate max-w-[180px]">
                        {p.prepaymentDescription}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{formatCurrency(p.amount, p.currency)}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 justify-end">
                    <FontAwesomeIcon icon={faClock} className="text-[10px]" />
                    {formatDate(p.paidAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-8">No recent payments</p>
        )}
      </Card>
    </div>
  );
}