import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDay, faCalendarWeek, faExclamationTriangle, faIdCard,
  faFilePdf, faPrint, faBus, faPlaneUp, faRightLeft, faShirt,
} from '@fortawesome/free-solid-svg-icons';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  fetchDailyReport, fetchRangeReport, fetchArrearsReport,
  selectDailyReport, selectRangeReport, selectArrearsReport, selectReportsLoading
} from '../../store/slices/reportsSlice';
import { fetchGrades, selectGrades, fetchActiveYear, fetchActiveTerm, selectActiveYear, selectActiveTerm } from '../../store/slices/academicSlice';
import { SectionHeader, Card, CardHeader } from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import { DateRangePicker } from '../../components/ui/SearchBar';
import Button from '../../components/ui/Button';
import { formatCurrency, formatDate, todayInputDate } from '../../utils/formatters';
import { fetchSettings, selectSettings } from '../../store/slices/settingsSlice';
import { LOGO_CREST } from '../../assets/logoAssets';

const TABS = [
  { key: 'daily',      label: 'Daily Report',        icon: faCalendarDay         },
  { key: 'range',      label: 'Date Range',          icon: faCalendarWeek        },
  { key: 'arrears',    label: 'Arrears Report',      icon: faExclamationTriangle },
];

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];

// ─── helpers ───────────────────────────────────────────────────────────────
function fmt(amount, currency) {
  if (currency === 'ZIG') return `ZIG ${Number(amount ?? 0).toFixed(2)}`;
  return `USD ${Number(amount ?? 0).toFixed(2)}`;
}


function ReportSummary({ report }) {
  if (!report) return null;
  const hasPrepayment    = (report.prepaymentTotal       ?? 0) > 0;
  const hasZigIncome     = (report.cashIncomeZig         ?? 0) > 0;
  const hasZigExpense    = (report.totalExpensesZig      ?? 0) > 0;
  const zigIncomeAsUsd   =  report.cashIncomeZigAsUsd    ?? 0;
  const zigExpenseAsUsd  =  report.totalExpensesZigAsUsd ?? 0;
  const combinedIncome   = (report.cashIncome ?? 0) + zigIncomeAsUsd;
  const combinedExpenses = (report.totalExpenses ?? 0) + zigExpenseAsUsd;
  const trueBalance      = combinedIncome - combinedExpenses;

  return (
    <div className="space-y-3 mb-5">
      {/* Top summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">💵 USD Cash Income</p>
          <p className="font-bold text-lg text-emerald-600">{formatCurrency(report.cashIncome, 'USD')}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">USD Expenses</p>
          <p className="font-bold text-lg text-red-600">{formatCurrency(report.totalExpenses, 'USD')}</p>
          {hasZigExpense && (
            <p className="text-xs text-amber-600 mt-0.5">+ZiG {Number(report.totalExpensesZig).toFixed(2)}</p>
          )}
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Net Balance</p>
          <p className={`font-bold text-lg ${trueBalance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
            {formatCurrency(trueBalance, 'USD')}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">all currencies as USD</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Payments</p>
          <p className="font-bold text-lg text-slate-800">{report.paymentCount ?? '—'}</p>
        </div>
      </div>

      {/* ZiG income breakdown */}
      {hasZigIncome && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="font-semibold text-amber-800">💴 ZiG Cash Received</span>
              <p className="text-xs text-amber-600 mt-0.5">Raw ZiG amount collected</p>
            </div>
            <span className="font-bold text-amber-800">{formatCurrency(report.cashIncomeZig, 'ZIG')}</span>
          </div>
          {zigIncomeAsUsd > 0 && (
            <>
              <div className="border-t border-amber-200 pt-2 flex items-center justify-between text-sm">
                <div>
                  <span className="font-semibold text-amber-700">≈ USD Equivalent of ZiG Income</span>
                  <p className="text-xs text-amber-600 mt-0.5">Converted at rate per transaction</p>
                </div>
                <span className="font-bold text-amber-700">≈ {formatCurrency(zigIncomeAsUsd, 'USD')}</span>
              </div>
              <div className="border-t border-amber-200 pt-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">Combined Income (USD + ZiG as USD)</span>
                <span className="font-bold text-emerald-700">{formatCurrency(combinedIncome, 'USD')}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ZiG expense breakdown */}
      {hasZigExpense && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="font-semibold text-red-800">💴 ZiG Expenses</span>
              <p className="text-xs text-red-600 mt-0.5">Raw ZiG amount spent</p>
            </div>
            <span className="font-bold text-red-800">{formatCurrency(report.totalExpensesZig, 'ZIG')}</span>
          </div>
          {zigExpenseAsUsd > 0 && (
            <div className="border-t border-red-200 pt-2 flex items-center justify-between text-sm">
              <div>
                <span className="font-semibold text-red-700">≈ USD Equivalent of ZiG Expenses</span>
                <p className="text-xs text-red-600 mt-0.5">Converted at rate per transaction</p>
              </div>
              <span className="font-bold text-red-700">≈ {formatCurrency(zigExpenseAsUsd, 'USD')}</span>
            </div>
          )}
        </div>
      )}

      {/* In-kind */}
      {hasPrepayment && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
          <div>
            <span className="font-semibold text-amber-800">In-Kind Contributions</span>
            <span className="text-amber-600 ml-2">({report.prepaymentCount} transaction{report.prepaymentCount !== 1 ? 's' : ''})</span>
            <p className="text-xs text-amber-600 mt-0.5">Estimated value only — not included in cash balance</p>
          </div>
          <span className="font-bold text-amber-700">{formatCurrency(report.prepaymentTotal, 'USD')}</span>
        </div>
      )}
    </div>
  );
}

// ─── PDF print component ────────────────────────────────────────────────────
function ReportPrintView({ report, title, subtitle, onClose, settings }) {
  if (!report) return null;

  const schoolName = settings?.schoolName || 'ROCK OUT COLLEGE';
  const logoSrc    = settings?.schoolLogo || LOGO_CREST;
  const printNow   = () => window.print();

  // Income rows — each method+currency kept separate
  const cashRows    = (report.incomeByMethod ?? []).filter(m => !m.isPrepayment);
  const inkindRows  = (report.incomeByMethod ?? []).filter(m =>  m.isPrepayment);

  // Expense rows — each category+currency kept separate
  const expenseRows = report.expensesByCategory ?? [];

  const usdCash    = cashRows.filter(r => r.currency === 'USD').reduce((s,r) => s + r.total, 0);
  const zigCash    = cashRows.filter(r => r.currency === 'ZIG').reduce((s,r) => s + r.total, 0);
  const inkindTotal= inkindRows.reduce((s,r) => s + r.total, 0);
  const usdExp     = expenseRows.filter(r => r.currency === 'USD').reduce((s,r) => s + r.total, 0);
  const zigExp     = expenseRows.filter(r => r.currency === 'ZIG').reduce((s,r) => s + r.total, 0);

  return createPortal(
    <div className="print-overlay fixed inset-0 z-50 bg-white overflow-auto">
      {/* Toolbar — hidden on print */}
      <div className="no-print sticky top-0 bg-slate-800 text-white px-6 py-3 flex items-center justify-between z-10">
        <span className="font-semibold text-sm">PDF Preview — {title}</span>
        <div className="flex gap-3">
          <button onClick={printNow}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded-lg">
            <FontAwesomeIcon icon={faPrint} />
            Print / Save as PDF
          </button>
          <button onClick={onClose}
            className="text-slate-300 hover:text-white text-sm px-3 py-1.5 rounded-lg border border-slate-600">
            Close
          </button>
        </div>
      </div>

      {/* ── Printable content ── */}
      <div className="print-area mx-auto max-w-2xl px-10 py-8 text-slate-800 text-sm font-sans">

        {/* ── School Header ── */}
        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-5 mb-6">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wide">{schoolName}</h1>
            <h2 className="text-base font-semibold text-slate-600 mt-1">{title}</h2>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            <p className="text-xs text-slate-400 mt-1">Generated: {new Date().toLocaleString('en-ZW')}</p>
          </div>
          <img src={logoSrc} alt="School Logo" className="h-20 w-20 object-contain" />
        </div>

        {/* ── Fee-Type Breakdown Section ── */}
        {(report.feeTypeBreakdown ?? []).length > 0 && (
          <Section title="Collection by Fee Type">
            <table className="w-full text-xs border-collapse mb-3">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-200 px-3 py-2 text-left font-semibold">Fee Type</th>
                  <th className="border border-slate-200 px-3 py-2 text-center font-semibold">Currency</th>
                  <th className="border border-slate-200 px-3 py-2 text-center font-semibold">Transactions</th>
                  <th className="border border-slate-200 px-3 py-2 text-right font-semibold">Amount</th>
                  <th className="border border-slate-200 px-3 py-2 text-right font-semibold">≈ USD</th>
                </tr>
              </thead>
              <tbody>
                {(report.feeTypeBreakdown ?? []).map((r, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border border-slate-200 px-3 py-1.5 font-medium">{r.label}</td>
                    <td className="border border-slate-200 px-3 py-1.5 text-center">{r.currency}</td>
                    <td className="border border-slate-200 px-3 py-1.5 text-center">{r.count}</td>
                    <td className="border border-slate-200 px-3 py-1.5 text-right">{fmt(r.total, r.currency)}</td>
                    <td className="border border-slate-200 px-3 py-1.5 text-right text-slate-500">
                      {r.currency === 'ZIG' ? fmt(r.totalUsd, 'USD') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* ── Income Section ── */}
        <Section title="Income">
          {/* Cash by method */}
          {cashRows.length > 0 && (
            <table className="w-full text-xs border-collapse mb-3">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-200 px-3 py-2 text-left font-semibold">Payment Method</th>
                  <th className="border border-slate-200 px-3 py-2 text-center font-semibold">Currency</th>
                  <th className="border border-slate-200 px-3 py-2 text-center font-semibold">Transactions</th>
                  <th className="border border-slate-200 px-3 py-2 text-right font-semibold">Amount</th>
                  <th className="border border-slate-200 px-3 py-2 text-right font-semibold">≈ USD Equiv.</th>
                </tr>
              </thead>
              <tbody>
                {cashRows.map((r, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border border-slate-200 px-3 py-1.5">{r.paymentMethodName}</td>
                    <td className="border border-slate-200 px-3 py-1.5 text-center">{r.currency}</td>
                    <td className="border border-slate-200 px-3 py-1.5 text-center">{r.count}</td>
                    <td className="border border-slate-200 px-3 py-1.5 text-right font-medium">{fmt(r.total, r.currency)}</td>
                    <td className="border border-slate-200 px-3 py-1.5 text-right text-slate-500">
                      {r.currency === 'ZIG' ? fmt(r.totalUsd ?? r.total, 'USD') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {/* Cash subtotals — each currency separate */}
          <div className="space-y-1 mb-3">
            <TotalRow label="💵 Total USD Cash Received" value={fmt(usdCash, 'USD')} />
            {zigCash > 0 && <TotalRow label="💴 Total ZIG Cash Received" value={fmt(zigCash, 'ZIG')} note="kept separate from USD" />}
          </div>
          {/* In-kind */}
          {inkindRows.length > 0 && (
            <div className="border border-amber-200 bg-amber-50 rounded p-3 mt-2">
              <p className="font-semibold text-amber-800 text-xs mb-1.5">In-Kind Contributions (estimated values — not included in cash totals)</p>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-amber-100">
                    <th className="border border-amber-200 px-3 py-1.5 text-left font-semibold">Method</th>
                    <th className="border border-amber-200 px-3 py-1.5 text-center font-semibold">Transactions</th>
                    <th className="border border-amber-200 px-3 py-1.5 text-right font-semibold">Est. Value</th>
                  </tr>
                </thead>
                <tbody>
                  {inkindRows.map((r, i) => (
                    <tr key={i} className="bg-white">
                      <td className="border border-amber-200 px-3 py-1">{r.paymentMethodName}</td>
                      <td className="border border-amber-200 px-3 py-1 text-center">{r.count}</td>
                      <td className="border border-amber-200 px-3 py-1 text-right">{inkindTotal > 0 ? fmt(r.total, r.currency) : <span className="italic text-slate-400">not valued</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {inkindTotal > 0 && (
                <div className="flex justify-between mt-2 text-xs font-bold text-amber-800">
                  <span>Total Estimated In-Kind</span>
                  <span>{fmt(inkindTotal, 'USD')}</span>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* ── Expenses Section ── */}
        <Section title="Expenses">
          {expenseRows.length > 0 ? (
            <>
              <table className="w-full text-xs border-collapse mb-3">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-200 px-3 py-2 text-left font-semibold">Category</th>
                    <th className="border border-slate-200 px-3 py-2 text-center font-semibold">Currency</th>
                    <th className="border border-slate-200 px-3 py-2 text-center font-semibold">Count</th>
                    <th className="border border-slate-200 px-3 py-2 text-right font-semibold">Amount</th>
                    <th className="border border-slate-200 px-3 py-2 text-right font-semibold">≈ USD Equiv.</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseRows.map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="border border-slate-200 px-3 py-1.5">{r.categoryName}</td>
                      <td className="border border-slate-200 px-3 py-1.5 text-center">{r.currency}</td>
                      <td className="border border-slate-200 px-3 py-1.5 text-center">{r.count}</td>
                      <td className="border border-slate-200 px-3 py-1.5 text-right font-medium text-red-700">{fmt(r.total, r.currency)}</td>
                      <td className="border border-slate-200 px-3 py-1.5 text-right text-slate-500">
                        {r.currency === 'ZIG' ? fmt(r.totalUsd ?? 0, 'USD') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="space-y-1">
                <TotalRow label="Total USD Expenses" value={fmt(usdExp, 'USD')} red />
                {zigExp > 0 && (
                  <>
                    <TotalRow label="Total ZiG Expenses" value={fmt(zigExp, 'ZIG')} red note="raw ZiG" />
                    <TotalRow label="≈ ZiG Expenses as USD" value={fmt(report?.totalExpensesZigAsUsd ?? 0, 'USD')} red note="at rate per transaction" />
                  </>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400 italic">No expenses recorded for this period.</p>
          )}
        </Section>

        {/* ── Net Balance ── */}
        <Section title="Summary">
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 px-3 bg-emerald-50 rounded text-sm">
              <span className="font-medium text-slate-700">💵 USD Cash Received</span>
              <span className="font-bold text-emerald-700">{fmt(usdCash, 'USD')}</span>
            </div>
            {zigCash > 0 && (
              <>
                <div className="flex justify-between items-center py-2 px-3 bg-amber-50 border border-amber-200 rounded text-sm">
                  <div>
                    <span className="font-medium text-amber-800">💴 ZiG Cash Received</span>
                    <span className="text-xs text-amber-600 ml-2">(raw ZiG amount)</span>
                  </div>
                  <span className="font-bold text-amber-800">{fmt(zigCash, 'ZIG')}</span>
                </div>
                <div className="flex justify-between items-center py-2 px-3 bg-amber-50 border border-amber-200 rounded text-sm">
                  <span className="font-medium text-amber-700">≈ ZiG Income as USD</span>
                  <span className="font-bold text-amber-700">≈ {fmt(report?.cashIncomeZigAsUsd ?? 0, 'USD')}</span>
                </div>
                <div className="flex justify-between items-center py-2 px-3 bg-emerald-50 border border-emerald-300 rounded text-sm">
                  <span className="font-medium text-emerald-800">Combined Income</span>
                  <span className="font-bold text-emerald-700">{fmt(usdCash + (report?.cashIncomeZigAsUsd ?? 0), 'USD')}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center py-2 px-3 bg-red-50 rounded text-sm">
              <span className="font-medium text-slate-700">USD Expenses</span>
              <span className="font-bold text-red-700">{fmt(usdExp, 'USD')}</span>
            </div>
            {zigExp > 0 && (
              <>
                <div className="flex justify-between items-center py-2 px-3 bg-red-50 border border-red-200 rounded text-sm">
                  <div>
                    <span className="font-medium text-red-800">💴 ZiG Expenses</span>
                    <span className="text-xs text-red-600 ml-2">(raw ZiG)</span>
                  </div>
                  <span className="font-bold text-red-800">{fmt(zigExp, 'ZIG')}</span>
                </div>
                <div className="flex justify-between items-center py-2 px-3 bg-red-50 border border-red-200 rounded text-sm">
                  <span className="font-medium text-red-700">≈ ZiG Expenses as USD</span>
                  <span className="font-bold text-red-700">≈ {fmt(report?.totalExpensesZigAsUsd ?? 0, 'USD')}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center py-2.5 px-3 bg-slate-800 rounded text-sm">
              <div>
                <span className="font-bold text-white">Net Balance</span>
                <span className="text-xs text-slate-400 ml-2">(all currencies as USD)</span>
              </div>
              {(() => {
                const totalIn  = usdCash + (report?.cashIncomeZigAsUsd     ?? 0);
                const totalOut = usdExp  + (report?.totalExpensesZigAsUsd  ?? 0);
                const net      = totalIn - totalOut;
                return (
                  <span className={`font-bold text-base ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmt(net, 'USD')}
                  </span>
                );
              })()}
            </div>
            {inkindTotal > 0 && (
              <div className="flex justify-between items-center py-2 px-3 bg-amber-50 border border-amber-200 rounded text-sm">
                <div>
                  <span className="font-medium text-amber-800">In-Kind Contributions</span>
                  <span className="text-xs text-amber-600 ml-2">(estimated — not in balance)</span>
                </div>
                <span className="font-bold text-amber-800">{fmt(inkindTotal, 'USD')}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-1.5 px-3 text-xs text-slate-400">
              <span>Total payments processed</span>
              <span>{report?.paymentCount ?? 0}</span>
            </div>
          </div>
        </Section>

        {/* Footer */}
        <div className="border-t border-slate-200 mt-8 pt-4 text-xs text-slate-400 text-center">
          <p>{schoolName} · School Fees Management System</p>
          <p className="mt-0.5">USD and ZIG are never combined in this report.</p>
        </div>

        {/* Signature block */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex justify-end">
          <div className="text-center min-w-[200px]">
            {report.generatedBySignature ? (
              <img
                src={report.generatedBySignature}
                alt="Signature"
                className="h-14 mx-auto object-contain mb-1"
              />
            ) : (
              <div className="h-10 border-b border-slate-400 w-48 mx-auto mb-1" />
            )}
            <p className="text-xs font-semibold text-slate-700">{report.generatedByName || 'Report Generated By'}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Authorised Signature</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }

          /* Hide the React app root, show only our portal overlay */
          #root { display: none !important; }

          .print-overlay {
            position: static !important;
            overflow: visible !important;
            height: auto !important;
            width: 100% !important;
            display: block !important;
          }

          .print-area {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 10mm 12mm !important;
          }

          table  { page-break-inside: auto; }
          tr     { page-break-inside: avoid; page-break-after: auto; }
          thead  { display: table-header-group; }
          h3     { page-break-after: avoid; }

          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 8mm; size: A4; }
        }
      `}</style>
    </div>
  , document.body);
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="font-bold text-sm uppercase tracking-wide text-slate-700 border-b border-slate-300 pb-1 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function TotalRow({ label, value, red, note }) {
  return (
    <div className={`flex justify-between items-center px-3 py-2 rounded text-xs font-semibold ${red ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
      <span>{label}{note && <span className="font-normal text-slate-400 ml-1">({note})</span>}</span>
      <span>{value}</span>
    </div>
  );
}

// ─── Fee-type breakdown card ────────────────────────────────────────────────
function FeeTypeBreakdownCard({ report }) {
  const rows = report?.feeTypeBreakdown ?? [];
  if (!rows.length) return null;

  // Group by label so USD + ZIG for the same fee appear on one row
  const grouped = {};
  rows.forEach(r => {
    if (!grouped[r.feeType]) grouped[r.feeType] = { label: r.label, usd: 0, zig: 0, usdEq: 0, count: 0 };
    if (r.currency === 'ZIG') { grouped[r.feeType].zig   += r.total; }
    else                       { grouped[r.feeType].usd   += r.total; }
    grouped[r.feeType].usdEq += r.totalUsd;
    grouped[r.feeType].count += r.count;
  });

  return (
    <Card>
      <CardHeader title="Collection by Fee Type" subtitle="Breakdown of what was collected per fee category" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs text-slate-500 font-semibold">
              <th className="text-left pb-2 pr-4">Fee Type</th>
              <th className="text-right pb-2 px-3">USD Collected</th>
              <th className="text-right pb-2 px-3">ZIG Collected</th>
              <th className="text-right pb-2 pl-3">≈ USD Total</th>
              <th className="text-right pb-2 pl-3">Transactions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {Object.values(grouped).map((g, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="py-2 pr-4 font-medium text-slate-800">{g.label}</td>
                <td className="py-2 px-3 text-right text-emerald-700 font-mono text-xs">
                  {g.usd > 0 ? formatCurrency(g.usd, 'USD') : <span className="text-slate-300">—</span>}
                </td>
                <td className="py-2 px-3 text-right text-amber-700 font-mono text-xs">
                  {g.zig > 0 ? formatCurrency(g.zig, 'ZIG') : <span className="text-slate-300">—</span>}
                </td>
                <td className="py-2 pl-3 text-right font-semibold text-slate-800 font-mono text-xs">
                  {formatCurrency(g.usdEq > 0 ? g.usdEq : g.usd, 'USD')}
                </td>
                <td className="py-2 pl-3 text-right text-slate-500">{g.count}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 font-semibold">
              <td className="pt-2 pr-4 text-slate-700">Total</td>
              <td className="pt-2 px-3 text-right text-emerald-700 font-mono text-xs">
                {formatCurrency(Object.values(grouped).reduce((s, g) => s + g.usd, 0), 'USD')}
              </td>
              <td className="pt-2 px-3 text-right text-amber-700 font-mono text-xs">
                {formatCurrency(Object.values(grouped).reduce((s, g) => s + g.zig, 0), 'ZIG')}
              </td>
              <td className="pt-2 pl-3 text-right text-slate-800 font-mono text-xs">
                {formatCurrency(Object.values(grouped).reduce((s, g) => s + (g.usdEq > 0 ? g.usdEq : g.usd), 0), 'USD')}
              </td>
              <td className="pt-2 pl-3 text-right text-slate-500">
                {Object.values(grouped).reduce((s, g) => s + g.count, 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const dispatch   = useAppDispatch();
  const navigate   = useNavigate();
  const [tab, setTab]     = useState('daily');
  const [date, setDate]   = useState(todayInputDate());
  const [from, setFrom]   = useState(todayInputDate());
  const [to,   setTo]     = useState(todayInputDate());
  const [showPdf, setShowPdf] = useState(false);

  const settings = useAppSelector(selectSettings);
  const daily    = useAppSelector(selectDailyReport);
  const range    = useAppSelector(selectRangeReport);
  const arrears  = useAppSelector(selectArrearsReport);
  const loading  = useAppSelector(selectReportsLoading);
  const grades   = useAppSelector(selectGrades);
  const activeYear = useAppSelector(selectActiveYear);
  const activeTerm = useAppSelector(selectActiveTerm);
  const [gradeId, setGradeId] = useState('');

  useEffect(() => {
    dispatch(fetchSettings());
    dispatch(fetchGrades());
    dispatch(fetchActiveYear());
    dispatch(fetchActiveTerm());
  }, [dispatch]);

  const loadDaily   = () => dispatch(fetchDailyReport({ date }));
  const loadRange   = () => dispatch(fetchRangeReport({ from, to }));
  const loadArrears = () => {
    if (activeYear && activeTerm)
      dispatch(fetchArrearsReport({ academicYearId: activeYear.id, termId: activeTerm.id, gradeId: gradeId || undefined }));
  };

  useEffect(() => { if (tab === 'daily')   loadDaily();   }, [tab, date]);
  useEffect(() => { if (tab === 'arrears') loadArrears(); }, [tab, activeYear, activeTerm]);

  // Which report + label is active
  const activeReport = tab === 'daily' ? daily : tab === 'range' ? range : null;
  const pdfTitle = tab === 'daily'
    ? `Daily Report — ${formatDate(date)}`
    : `Report: ${formatDate(from)} to ${formatDate(to)}`;
  const pdfSubtitle = tab === 'daily'
    ? `End-of-day financial summary for ${formatDate(date)}`
    : `Financial summary for date range ${formatDate(from)} – ${formatDate(to)}`;

  const ARREARS_COLS = [
    { key: 'fullName',      label: 'Student',   render: r => <span className="font-medium">{r.fullName}</span> },
    { key: 'studentNumber', label: 'Num'        },
    { key: 'gradeName',     label: 'Grade'      },
    { key: 'totalPaid',     label: 'Paid',      align: 'right', render: r => formatCurrency(r.totalPaid, 'USD') },
    { key: 'totalOwing',    label: 'Owing',     align: 'right',
      render: r => <span className="font-bold text-red-600">{formatCurrency(r.totalOwing, 'USD')}</span> },
  ];

  return (
    <>
      {showPdf && activeReport && (
        <ReportPrintView
          report={activeReport}
          title={pdfTitle}
          subtitle={pdfSubtitle}
          onClose={() => setShowPdf(false)}
          settings={settings}
        />
      )}

      <div className="space-y-5">
        <SectionHeader title="Reports" subtitle="Financial summaries, fee arrears, and standalone payment reports" />

        {/* Quick links to standalone payment report pages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: faBus,      label: 'Transport Payments', sub: 'Who paid transport and when', route: ROUTES.TRANSPORT_REPORT },
            { icon: faPlaneUp,  label: 'Trip Payments',      sub: 'Payments per trip',            route: ROUTES.TRIP_REPORT      },
            { icon: faShirt,    label: 'Uniform Sales',      sub: 'Items sold and revenue',       route: ROUTES.UNIFORM_REPORT   },
            { icon: faIdCard,   label: 'Reg & Project Fees', sub: 'Students who paid these fees', route: ROUTES.STANDALONE_FEES_REPORT },
            { icon: faRightLeft,label: 'Surplus Transfers',  sub: 'Full transfer audit log',      route: ROUTES.TRANSFER_LOG,  adminOnly: true },
          ].filter(card => !card.adminOnly || true).map(card => (
            <button key={card.label} type="button" onClick={() => navigate(card.route)}
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all text-left">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <FontAwesomeIcon icon={card.icon} className="text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{card.label}</p>
                <p className="text-xs text-slate-500">{card.sub}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setShowPdf(false); }}
              className={[
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                tab === t.key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700',
              ].join(' ')}
            >
              <FontAwesomeIcon icon={t.icon} className="text-xs" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Daily */}
        {tab === 'daily' && (
          <div className="space-y-4">
            <div className="flex gap-3 items-center flex-wrap">
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" />
              <Button size="sm" onClick={loadDaily} loading={loading}>Load</Button>
              {daily && (
                <button onClick={() => setShowPdf(true)}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-1.5 rounded-lg transition">
                  <FontAwesomeIcon icon={faFilePdf} />
                  Export PDF
                </button>
              )}
            </div>
            <ReportSummary report={daily} />
            <FeeTypeBreakdownCard report={daily} />
            {daily && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader title="Income by Method"
                    subtitle="Amber = in-kind contributions (not cash)" />
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={daily.incomeByMethod ?? []}>
                      <XAxis dataKey="paymentMethodName" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v, _, p) => [fmt(v, p.payload.currency), p.payload.paymentMethodName]} />
                      <Bar dataKey="total" radius={[4,4,0,0]}>
                        {(daily.incomeByMethod ?? []).map((entry, i) => (
                          <Cell key={i} fill={entry.isPrepayment ? '#f59e0b' : entry.currency === 'ZIG' ? '#10b981' : '#3b82f6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-slate-400 mt-1 px-1">Blue = USD · Green = ZIG · Amber = In-kind</p>
                </Card>
                <Card>
                  <CardHeader title="Expenses by Category" />
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={daily.expensesByCategory ?? []} dataKey="total" nameKey="categoryName"
                        cx="50%" cy="50%" outerRadius={70}
                        label={({ categoryName, percent }) => `${categoryName} ${(percent*100).toFixed(0)}%`}>
                        {(daily.expensesByCategory ?? []).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Range */}
        {tab === 'range' && (
          <div className="space-y-4">
            <div className="flex gap-3 items-center flex-wrap">
              <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
              <Button size="sm" onClick={loadRange} loading={loading}>Load</Button>
              {range && (
                <button onClick={() => setShowPdf(true)}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-1.5 rounded-lg transition">
                  <FontAwesomeIcon icon={faFilePdf} />
                  Export PDF
                </button>
              )}
            </div>
            <ReportSummary report={range} />
            <FeeTypeBreakdownCard report={range} />
            {range && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader title="Income by Method"
                    subtitle="Amber = in-kind · Green = ZIG · Blue = USD" />
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={range.incomeByMethod ?? []}>
                      <XAxis dataKey="paymentMethodName" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v, _, p) => [fmt(v, p.payload.currency), p.payload.paymentMethodName]} />
                      <Bar dataKey="total" radius={[4,4,0,0]}>
                        {(range.incomeByMethod ?? []).map((entry, i) => (
                          <Cell key={i} fill={entry.isPrepayment ? '#f59e0b' : entry.currency === 'ZIG' ? '#10b981' : '#3b82f6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
                <Card>
                  <CardHeader title="Expenses by Category" />
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={range.expensesByCategory ?? []} dataKey="total" nameKey="categoryName"
                        cx="50%" cy="50%" outerRadius={70}
                        label={({ categoryName, percent }) => `${categoryName} ${(percent*100).toFixed(0)}%`}>
                        {(range.expensesByCategory ?? []).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Arrears */}
        {tab === 'arrears' && (
          <div className="space-y-4">
            <div className="flex gap-3 items-center flex-wrap">
              <select
                value={gradeId}
                onChange={e => setGradeId(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">All Grades</option>
                {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <Button size="sm" onClick={loadArrears} loading={loading}>Load</Button>
            </div>
            {arrears && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {[
                  { l: 'Total Students', v: arrears.totalStudents                        },
                  { l: 'Students Owing', v: arrears.studentsOwing,   red: true           },
                  { l: 'Total Fees',     v: formatCurrency(arrears.totalFees,  'USD')    },
                  { l: 'Total Owing',    v: formatCurrency(arrears.totalOwing, 'USD'), red: true },
                ].map(({ l, v, red }) => (
                  <div key={l} className="bg-slate-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-500 mb-1">{l}</p>
                    <p className={`font-bold text-lg ${red ? 'text-red-600' : 'text-slate-800'}`}>{v}</p>
                  </div>
                ))}
              </div>
            )}
            <Table
              columns={ARREARS_COLS}
              data={arrears?.students ?? []}
              loading={loading}
              emptyMessage="No arrears found. All fees may be paid."
            />
          </div>
        )}
      </div>
    </>
  );
}