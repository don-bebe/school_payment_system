import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExchangeAlt, faArrowLeft, faPrint } from '@fortawesome/free-solid-svg-icons';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchTransferLog, selectTransferLog, selectReportsLoading } from '../../store/slices/reportsSlice';
import { fetchSettings, selectSettings } from '../../store/slices/settingsSlice';
import { SectionHeader, Card } from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export default function TransferLogPage() {
  const dispatch  = useAppDispatch();
  const navigate  = useNavigate();
  const rows      = useAppSelector(selectTransferLog);
  const loading   = useAppSelector(selectReportsLoading);
  const settings  = useAppSelector(selectSettings);
  const [from, setFrom] = useState('');
  const [to,   setTo]   = useState('');

  useEffect(() => { dispatch(fetchSettings()); load(); }, []); // eslint-disable-line

  const load = () => dispatch(fetchTransferLog({
    from: from || undefined,
    to:   to   || undefined,
  }));

  const total = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);

  const handlePrint = () => {
    const sn = settings?.schoolName || 'School';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Surplus Transfer Log</title>
      <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;color:#1e3a8a;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      @page{size:A4 landscape;margin:10mm}h2{font-size:16px;font-weight:800;margin-bottom:2px}h3{font-size:12px;margin-bottom:6px;font-weight:600}
      table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#1e3a8a;color:#fff;padding:5px 7px;text-align:left;font-size:10px}
      td{padding:4px 7px;border-bottom:1px solid #e2e8f0;font-size:10px}tr:nth-child(even) td{background:#f8fafc}
      .total{font-weight:700;font-size:11px;margin-top:8px;text-align:right}.footer{margin-top:12px;font-size:9px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:6px}
      </style></head><body>
      <h2>${sn}</h2><h3>Surplus Transfer Log</h3>
      <table><thead><tr><th>Date</th><th>Student</th><th>Number</th><th>Receipt</th><th>Transferred To</th><th style="text-align:right">Amount</th><th>Reason</th><th>By</th></tr></thead>
      <tbody>${rows.map(r=>`<tr><td>${formatDateTime(r.transferredAt)}</td><td>${r.studentName}</td>
        <td style="font-family:monospace">${r.studentNumber}</td>
        <td style="font-family:monospace;color:#2563eb">${r.receiptNumber??''}</td>
        <td><strong>${r.targetLabel??''}</strong></td>
        <td style="text-align:right;font-weight:700;color:#059669">${formatCurrency(r.amount)}</td>
        <td style="color:#64748b;font-style:italic;font-size:9px">${r.reason??''}</td>
        <td style="color:#64748b;font-size:9px">${r.transferredByName??''}</td></tr>`).join('')}
      </tbody></table>
      <div class="total">Total Transferred: ${formatCurrency(total)}</div>
      <div class="footer">Printed ${new Date().toLocaleString()} · ${sn}</div>
      <script>window.onload=function(){window.print();setTimeout(function(){window.close();},500);}</script>
      </body></html>`;
    if (window.electronAPI?.printHtml) { window.electronAPI.printHtml(html); return; }
    const w = window.open('','_blank','width=1000,height=700');
    if (w) { w.document.write(html); w.document.close(); }
  };

  const FEE_COLORS = {
    'Tuition Fee':           'bg-blue-100 text-blue-800',
    'Sports Levy':           'bg-green-100 text-green-800',
    'Registration Fee (Exam)': 'bg-purple-100 text-purple-800',
    'Transport Fee':         'bg-orange-100 text-orange-800',
    'Trip Payment':          'bg-pink-100 text-pink-800',
    'Project Fee':           'bg-yellow-100 text-yellow-800',
    'Uniform':               'bg-indigo-100 text-indigo-800',
    'Report Book':           'bg-slate-100 text-slate-800',
  };

  const COLS = [
    { key: 'transferredAt', label: 'Date',        render: r => <span className="text-xs">{formatDateTime(r.transferredAt)}</span> },
    { key: 'studentName',   label: 'Student',     render: r => <span className="font-medium text-slate-800">{r.studentName}</span> },
    { key: 'studentNumber', label: 'Num',          render: r => <span className="font-mono text-xs">{r.studentNumber}</span> },
    { key: 'receiptNumber', label: 'Receipt',      render: r => <span className="font-mono text-xs text-blue-600">{r.receiptNumber}</span> },
    { key: 'targetLabel',   label: 'Transferred To',
      render: r => {
        const cls = FEE_COLORS[r.targetLabel] ?? 'bg-slate-100 text-slate-600';
        return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{r.targetLabel}</span>;
      }
    },
    { key: 'amount',        label: 'Amount',      align: 'right',
      render: r => <span className="font-semibold text-emerald-700">{formatCurrency(r.amount)}</span> },
    { key: 'reason',        label: 'Reason',
      render: r => r.reason ? <span className="text-xs text-slate-500 italic">{r.reason}</span> : <span className="text-slate-300">—</span> },
    { key: 'transferredByName', label: 'By',       render: r => <span className="text-xs text-slate-600">{r.transferredByName}</span> },
  ];

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <SectionHeader title="Surplus Transfer Log"
            subtitle={rows.length > 0 ? `${rows.length} transfer${rows.length !== 1 ? 's' : ''} · Total: ${formatCurrency(total)}` : 'Filter and load'} />
        </div>
        {rows.length > 0 && (
          <Button icon={faPrint} variant="secondary" size="sm" onClick={handlePrint}>Print</Button>
        )}
      </div>
      <Card>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5" />
          </div>
          <Button size="sm" onClick={load} loading={loading}>Load</Button>
        </div>
      </Card>
      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { l: 'Total Transferred', v: formatCurrency(total),  c: 'text-emerald-600' },
            { l: 'Transfers',         v: rows.length,             c: 'text-slate-800'  },
            { l: 'Payments Involved', v: new Set(rows.map(r => r.paymentId)).size, c: 'text-slate-800' },
            { l: 'Students',          v: new Set(rows.map(r => r.studentId)).size, c: 'text-slate-800' },
          ].map(({ l, v, c }) => (
            <Card key={l}><p className="text-xs text-slate-500 mb-1">{l}</p><p className={`text-xl font-bold ${c}`}>{v}</p></Card>
          ))}
        </div>
      )}
      <Table columns={COLS} data={rows} loading={loading}
        emptyMessage="No surplus transfers found. Adjust date range and click Load."
        emptyIcon={faExchangeAlt} />
    </div>
  );
}
