import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faIdCard, faArrowLeft, faPrint } from '@fortawesome/free-solid-svg-icons';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  fetchStandaloneFeesReport,
  selectStandaloneFeesReport,
  selectReportsLoading,
} from '../../store/slices/reportsSlice';
import { fetchActiveYear, selectActiveYear } from '../../store/slices/academicSlice';
import { fetchSettings, selectSettings } from '../../store/slices/settingsSlice';
import { SectionHeader, Card } from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function StandaloneFeesPage() {
  const dispatch   = useAppDispatch();
  const navigate   = useNavigate();
  const rows       = useAppSelector(selectStandaloneFeesReport);
  const loading    = useAppSelector(selectReportsLoading);
  const activeYear = useAppSelector(selectActiveYear);
  const settings   = useAppSelector(selectSettings);
  const [feeType, setFeeType] = useState('all');

  useEffect(() => { dispatch(fetchActiveYear()); dispatch(fetchSettings()); }, [dispatch]);
  useEffect(() => { if (activeYear) load(); }, [activeYear]); // eslint-disable-line

  const load = () => {
    if (!activeYear) return;
    dispatch(fetchStandaloneFeesReport({ academicYearId: activeYear.id, feeType }));
  };

  const handlePrint = () => {
    const sn = settings?.schoolName || 'School';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Standalone Fees Report</title>
      <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;color:#1e3a8a;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      @page{size:A4 landscape;margin:10mm}h2{font-size:16px;font-weight:800;margin-bottom:2px}h3{font-size:12px;margin-bottom:6px;font-weight:600}
      table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#1e3a8a;color:#fff;padding:5px 7px;text-align:left;font-size:10px}
      td{padding:4px 7px;border-bottom:1px solid #e2e8f0;font-size:10px}tr:nth-child(even) td{background:#f8fafc}
      .badge-reg{background:#dbeafe;color:#1d4ed8;padding:1px 6px;border-radius:9px;font-size:9px;font-weight:700}
      .badge-proj{background:#ede9fe;color:#6d28d9;padding:1px 6px;border-radius:9px;font-size:9px;font-weight:700}
      .paid{color:#16a34a;font-weight:700}.partial{color:#d97706;font-weight:700}.unpaid{color:#dc2626}
      .total{font-weight:700;font-size:11px;margin-top:8px;text-align:right}.footer{margin-top:12px;font-size:9px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:6px}
      </style></head><body>
      <h2>${sn}</h2><h3>Registration &amp; Project Fees — ${activeYear?.name ?? ''}</h3>
      <table><thead><tr><th>Student</th><th>Number</th><th>Grade</th><th>Fee Type</th><th>Total Paid</th><th>Fee Due</th><th>Balance</th><th>Status</th><th>Method</th><th>Receipts</th><th>Last Payment</th></tr></thead>
      <tbody>${rows.map(r => {
        const bal = Number(r.balance ?? 0);
        const status = bal <= 0 ? 'Paid' : Number(r.totalPaid) > 0 ? 'Partial' : 'Unpaid';
        const sc = bal <= 0 ? 'paid' : Number(r.totalPaid) > 0 ? 'partial' : 'unpaid';
        return `<tr>
          <td>${r.studentName}</td><td style="font-family:monospace">${r.studentNumber}</td><td>${r.gradeName??''}</td>
          <td><span class="${r.feeType==='Registration Fee'?'badge-reg':'badge-proj'}">${r.feeType}</span></td>
          <td style="text-align:right;font-weight:600">${formatCurrency(r.totalPaid,r.currency)}</td>
          <td style="text-align:right">${formatCurrency(r.feeDue,r.currency)}</td>
          <td style="text-align:right">${bal > 0 ? formatCurrency(bal,r.currency) : '—'}</td>
          <td class="${sc}">${status}</td>
          <td>${r.paymentMethod??''}</td>
          <td style="font-family:monospace;color:#2563eb;font-size:9px">${r.receiptNumbers??''}</td>
          <td>${formatDate(r.lastPaymentAt)}</td>
        </tr>`;
      }).join('')}
      </tbody></table>
      <div class="total">Total Collected: ${formatCurrency(rows.reduce((s,r)=>s+Number(r.totalPaid??0),0))} · 
        Outstanding: ${formatCurrency(rows.reduce((s,r)=>s+Number(r.balance??0),0))}</div>
      <div class="footer">Printed ${new Date().toLocaleString()} · ${sn}</div>
      <script>window.onload=function(){window.print();setTimeout(function(){window.close();},500);}</script>
      </body></html>`;
    if (window.electronAPI?.printHtml) { window.electronAPI.printHtml(html); return; }
    const w = window.open('','_blank','width=1200,height=700');
    if (w) { w.document.write(html); w.document.close(); }
  };

  const regRows  = rows.filter(r => r.feeType === 'Registration Fee');
  const projRows = rows.filter(r => r.feeType === 'Project Fee');
  const totalCollected = rows.reduce((s, r) => s + Number(r.totalPaid ?? 0), 0);
  const totalOutstanding = rows.reduce((s, r) => s + Number(r.balance ?? 0), 0);

  const statusBadge = (row) => {
    const bal = Number(row.balance ?? 0);
    if (bal <= 0) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Paid</span>;
    if (Number(row.totalPaid) > 0) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Partial</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Unpaid</span>;
  };

  const COLS = [
    { key: 'studentName',   label: 'Student',   render: r => <span className="font-medium text-slate-800">{r.studentName}</span> },
    { key: 'studentNumber', label: 'Num',        render: r => <span className="font-mono text-xs">{r.studentNumber}</span> },
    { key: 'gradeName',     label: 'Grade' },
    { key: 'feeType',       label: 'Fee Type',
      render: r => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          r.feeType === 'Registration Fee' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
        }`}>{r.feeType}</span>
      ),
    },
    { key: 'totalPaid',     label: 'Total Paid', align: 'right',
      render: r => <span className="font-semibold text-emerald-700">{formatCurrency(r.totalPaid, r.currency)}</span> },
    { key: 'feeDue',        label: 'Fee Due',    align: 'right',
      render: r => <span className="text-slate-600">{formatCurrency(r.feeDue, r.currency)}</span> },
    { key: 'balance',       label: 'Balance',    align: 'right',
      render: r => Number(r.balance) > 0
        ? <span className="font-semibold text-red-600">{formatCurrency(r.balance, r.currency)}</span>
        : <span className="text-slate-400">—</span> },
    { key: 'status',        label: 'Status',     render: statusBadge },
    { key: 'paymentMethod', label: 'Method' },
    { key: 'receiptNumbers',label: 'Receipts',   render: r => <span className="font-mono text-xs text-blue-600">{r.receiptNumbers}</span> },
    { key: 'lastPaymentAt', label: 'Last Paid',  render: r => formatDate(r.lastPaymentAt) },
  ];

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <SectionHeader
            title="Registration & Project Fees"
            subtitle={rows.length > 0
              ? `${rows.length} students · Collected: ${formatCurrency(totalCollected)} · Outstanding: ${formatCurrency(totalOutstanding)}`
              : 'Aggregated totals per student'}
          />
        </div>
        {rows.length > 0 && (
          <Button icon={faPrint} variant="secondary" size="sm" onClick={handlePrint}>Print</Button>
        )}
      </div>

      <Card>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Fee Type</label>
            <select
              value={feeType}
              onChange={e => setFeeType(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="all">All Fee Types</option>
              <option value="registration">Registration Fee Only</option>
              <option value="project">Project Fee Only</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Year</label>
            <input type="text" readOnly value={activeYear?.year ?? '—'}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 w-20 text-center" />
          </div>
          <Button size="sm" onClick={load} loading={loading}>Load</Button>
        </div>
      </Card>

      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { l: 'Total Collected',    v: formatCurrency(totalCollected),    c: 'text-emerald-600' },
            { l: 'Outstanding',        v: formatCurrency(totalOutstanding),  c: totalOutstanding > 0 ? 'text-red-600' : 'text-slate-400' },
            { l: 'Registration Fees',  v: regRows.length + ' students',      c: 'text-blue-600'    },
            { l: 'Project Fees',       v: projRows.length + ' students',     c: 'text-purple-600'  },
          ].map(({ l, v, c }) => (
            <Card key={l}>
              <p className="text-xs text-slate-500 mb-1">{l}</p>
              <p className={`text-xl font-bold ${c}`}>{v}</p>
            </Card>
          ))}
        </div>
      )}

      <Table
        columns={COLS}
        data={rows}
        loading={loading}
        emptyMessage="No payments found. Adjust the filter and click Load."
        emptyIcon={faIdCard}
      />
    </div>
  );
}
