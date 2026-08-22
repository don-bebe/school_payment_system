import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlaneUp, faArrowLeft, faPrint } from '@fortawesome/free-solid-svg-icons';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchTripReport, selectTripReport, selectReportsLoading } from '../../store/slices/reportsSlice';
import { fetchGrades, fetchTerms, fetchActiveYear, selectGrades, selectTerms, selectActiveYear } from '../../store/slices/academicSlice';
import { fetchSettings, selectSettings } from '../../store/slices/settingsSlice';
import { feesApi } from '../../api/services';
import { SectionHeader, Card } from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function TripReportPage() {
  const dispatch   = useAppDispatch();
  const navigate   = useNavigate();
  const rows       = useAppSelector(selectTripReport);
  const loading    = useAppSelector(selectReportsLoading);
  const grades     = useAppSelector(selectGrades);
  const terms      = useAppSelector(selectTerms);
  const activeYear = useAppSelector(selectActiveYear);
  const settings   = useAppSelector(selectSettings);
  const [trips, setTrips] = useState([]);
  const [filters, setFilters] = useState({ termId: '', tripSettingId: '', gradeId: '', from: '', to: '' });

  useEffect(() => { dispatch(fetchGrades()); dispatch(fetchActiveYear()); dispatch(fetchSettings()); }, [dispatch]);
  useEffect(() => { if (activeYear) dispatch(fetchTerms(activeYear.id)); }, [dispatch, activeYear]);
  useEffect(() => {
    if (!filters.termId) return;
    feesApi.getTrips(filters.termId, { activeOnly: false })
      .then(r => setTrips(r?.data?.data ?? r?.data ?? []))
      .catch(() => setTrips([]));
  }, [filters.termId]);
  useEffect(() => { load(); }, []); // eslint-disable-line

  const load = () => dispatch(fetchTripReport({
    termId:        filters.termId        || undefined,
    tripSettingId: filters.tripSettingId || undefined,
    gradeId:       filters.gradeId       || undefined,
    from:          filters.from          || undefined,
    to:            filters.to            || undefined,
  }));

  const set = k => e => setFilters(f => ({ ...f, [k]: e.target.value }));
  const total = rows.reduce((s, r) => s + Number(r.amountPaid ?? 0), 0);

  const handlePrint = () => {
    const sn = settings?.schoolName || 'School';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Trip Payments Report</title>
      <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;color:#1e3a8a;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      @page{size:A4 landscape;margin:10mm}h2{font-size:16px;font-weight:800;margin-bottom:2px}h3{font-size:12px;margin-bottom:6px;font-weight:600}
      table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#1e3a8a;color:#fff;padding:5px 7px;text-align:left;font-size:10px}
      td{padding:4px 7px;border-bottom:1px solid #e2e8f0;font-size:10px}tr:nth-child(even) td{background:#f8fafc}
      .total{font-weight:700;font-size:11px;margin-top:8px;text-align:right}.footer{margin-top:12px;font-size:9px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:6px}
      </style></head><body>
      <h2>${sn}</h2><h3>Trip Payments Report</h3>
      <table><thead><tr><th>Student</th><th>Number</th><th>Grade</th><th>Trip</th><th style="text-align:right">Amount</th><th>Method</th><th>Date</th><th>Receipt</th></tr></thead>
      <tbody>${rows.map(r=>`<tr><td>${r.studentName}</td><td style="font-family:monospace">${r.studentNumber}</td><td>${r.gradeName??''}</td>
        <td>${r.tripName??''}</td><td style="text-align:right;font-weight:600">${formatCurrency(r.amountPaid,r.currency)}</td>
        <td>${r.paymentMethod??''}</td><td>${formatDate(r.paidAt)}</td><td style="font-family:monospace;color:#2563eb">${r.receiptNumber??''}</td></tr>`).join('')}
      </tbody></table>
      <div class="total">Total: ${formatCurrency(total)}</div>
      <div class="footer">Printed ${new Date().toLocaleString()} · ${sn}</div>
      <script>window.onload=function(){window.print();setTimeout(function(){window.close();},500);}</script>
      </body></html>`;
    if (window.electronAPI?.printHtml) { window.electronAPI.printHtml(html); return; }
    const w = window.open('','_blank','width=1000,height=700');
    if (w) { w.document.write(html); w.document.close(); }
  };

  const COLS = [
    { key: 'studentName',   label: 'Student',   render: r => <span className="font-medium text-slate-800">{r.studentName}</span> },
    { key: 'studentNumber', label: 'Num',        render: r => <span className="font-mono text-xs">{r.studentNumber}</span> },
    { key: 'gradeName',     label: 'Grade' },
    { key: 'tripName',      label: 'Trip',       render: r => <span className="font-medium">{r.tripName}</span> },
    { key: 'amountPaid',    label: 'Amount',    align: 'right',
      render: r => <span className="font-semibold text-emerald-700">{formatCurrency(r.amountPaid, r.currency)}</span> },
    { key: 'paymentMethod', label: 'Method' },
    { key: 'paidAt',        label: 'Date',      render: r => formatDate(r.paidAt) },
    { key: 'receiptNumber', label: 'Receipt',   render: r => <span className="font-mono text-xs text-blue-600">{r.receiptNumber}</span> },
  ];

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <SectionHeader title="Trip Payments"
            subtitle={rows.length > 0 ? `${rows.length} payments · Total: ${formatCurrency(total)}` : 'Filter and load'} />
        </div>
        {rows.length > 0 && (
          <Button icon={faPrint} variant="secondary" size="sm" onClick={handlePrint}>Print</Button>
        )}
      </div>
      <Card>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Term</label>
            <select value={filters.termId} onChange={set('termId')}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200">
              <option value="">All Terms</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Trip</label>
            <select value={filters.tripSettingId} onChange={set('tripSettingId')}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200">
              <option value="">All Trips</option>
              {trips.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Grade</label>
            <select value={filters.gradeId} onChange={set('gradeId')}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200">
              <option value="">All Grades</option>
              {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
            <input type="date" value={filters.from} onChange={set('from')} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
            <input type="date" value={filters.to} onChange={set('to')} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5" />
          </div>
          <Button size="sm" onClick={load} loading={loading}>Load</Button>
        </div>
      </Card>
      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { l: 'Total Collected', v: formatCurrency(total), c: 'text-emerald-600' },
            { l: 'Payments',        v: rows.length,           c: 'text-slate-800'  },
            { l: 'Students',        v: new Set(rows.map(r => r.studentId)).size, c: 'text-slate-800' },
          ].map(({ l, v, c }) => (
            <Card key={l}><p className="text-xs text-slate-500 mb-1">{l}</p><p className={`text-xl font-bold ${c}`}>{v}</p></Card>
          ))}
        </div>
      )}
      <Table columns={COLS} data={rows} loading={loading}
        emptyMessage="No trip payments found. Adjust filters and click Load."
        emptyIcon={faPlaneUp} />
    </div>
  );
}
