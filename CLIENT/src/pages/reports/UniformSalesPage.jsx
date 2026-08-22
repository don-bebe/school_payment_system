import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShirt, faArrowLeft, faPrint } from '@fortawesome/free-solid-svg-icons';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchUniformSales, selectUniformSales, selectReportsLoading } from '../../store/slices/reportsSlice';
import { fetchYears, fetchGrades, selectYears, selectGrades } from '../../store/slices/academicSlice';
import { fetchSettings, selectSettings } from '../../store/slices/settingsSlice';
import { SectionHeader, Card } from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export default function UniformSalesPage() {
  const dispatch  = useAppDispatch();
  const navigate  = useNavigate();
  const rows      = useAppSelector(selectUniformSales);
  const loading   = useAppSelector(selectReportsLoading);
  const years     = useAppSelector(selectYears);
  const grades    = useAppSelector(selectGrades);
  const settings  = useAppSelector(selectSettings);

  const [from,           setFrom]           = useState('');
  const [to,             setTo]             = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [gradeId,        setGradeId]        = useState('');

  useEffect(() => {
    dispatch(fetchYears());
    dispatch(fetchGrades());
    dispatch(fetchSettings());
    load();
  }, []); // eslint-disable-line

  const load = () => dispatch(fetchUniformSales({
    from:           from           || undefined,
    to:             to             || undefined,
    academicYearId: academicYearId || undefined,
    gradeId:        gradeId        || undefined,
  }));

  const handlePrint = () => {
    const sn = settings?.schoolName || 'School';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Uniform Sales</title>
      <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;color:#1e3a8a;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      @page{size:A4 landscape;margin:10mm}h2{font-size:16px;font-weight:800;margin-bottom:2px}h3{font-size:12px;margin-bottom:6px;font-weight:600}
      table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#1e3a8a;color:#fff;padding:5px 7px;text-align:left;font-size:10px}
      td{padding:4px 7px;border-bottom:1px solid #e2e8f0;font-size:10px}tr:nth-child(even) td{background:#f8fafc}
      .badge{background:#e0e7ff;color:#3730a3;padding:1px 6px;border-radius:9px;font-size:9px;font-weight:700}
      .total{font-weight:700;font-size:11px;margin-top:8px;text-align:right}.footer{margin-top:12px;font-size:9px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:6px}
      </style></head><body>
      <h2>${sn}</h2><h3>Uniform Sales Report</h3>
      <table><thead><tr><th>Date</th><th>Student</th><th>Number</th><th>Receipt</th><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Total</th><th>By</th></tr></thead>
      <tbody>${rows.map(r=>`<tr><td>${formatDateTime(r.purchasedAt)}</td><td>${r.studentName}</td><td style="font-family:monospace">${r.studentNumber}</td>
        <td style="font-family:monospace;color:#2563eb">${r.receiptNumber??''}</td>
        <td><span class="badge">${r.itemName}</span></td>
        <td style="text-align:center;font-weight:600">${r.quantity}</td>
        <td style="text-align:right">${formatCurrency(r.unitPrice)}</td>
        <td style="text-align:right;font-weight:700;color:#059669">${formatCurrency(r.totalPrice)}</td>
        <td style="color:#64748b;font-size:9px">${r.recordedBy??''}</td></tr>`).join('')}
      </tbody></table>
      <div class="total">Total Revenue: ${formatCurrency(totalRevenue)} · ${totalQty} items</div>
      <div class="footer">Printed ${new Date().toLocaleString()} · ${sn}</div>
      <script>window.onload=function(){window.print();setTimeout(function(){window.close();},500);}</script>
      </body></html>`;
    if (window.electronAPI?.printHtml) { window.electronAPI.printHtml(html); return; }
    const w = window.open('','_blank','width=1000,height=700');
    if (w) { w.document.write(html); w.document.close(); }
  };

  const totalRevenue  = rows.reduce((s, r) => s + Number(r.totalPrice ?? 0), 0);
  const totalQty      = rows.reduce((s, r) => s + Number(r.quantity   ?? 0), 0);

  // Summary by item
  const byItem = Object.values(
    rows.reduce((acc, r) => {
      const k = r.itemName;
      if (!acc[k]) acc[k] = { name: k, qty: 0, revenue: 0 };
      acc[k].qty     += r.quantity;
      acc[k].revenue += r.totalPrice;
      return acc;
    }, {})
  ).sort((a, b) => b.revenue - a.revenue);

  const COLS = [
    { key: 'purchasedAt',  label: 'Date',    render: r => <span className="text-xs">{formatDateTime(r.purchasedAt)}</span> },
    { key: 'studentName',  label: 'Student', render: r => <span className="font-medium text-slate-800">{r.studentName}</span> },
    { key: 'studentNumber',label: 'Num',     render: r => <span className="font-mono text-xs">{r.studentNumber}</span> },
    { key: 'receiptNumber',label: 'Receipt', render: r => <span className="font-mono text-xs text-blue-600">{r.receiptNumber}</span> },
    { key: 'itemName',     label: 'Item',    render: r => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">{r.itemName}</span>
      )
    },
    { key: 'quantity',  label: 'Qty',    align: 'center', render: r => <span className="font-semibold">{r.quantity}</span> },
    { key: 'unitPrice', label: 'Unit $', align: 'right',  render: r => <span className="text-slate-600">{formatCurrency(r.unitPrice)}</span> },
    { key: 'totalPrice',label: 'Total',  align: 'right',  render: r => <span className="font-semibold text-emerald-700">{formatCurrency(r.totalPrice)}</span> },
    { key: 'recordedBy',label: 'By',     render: r => <span className="text-xs text-slate-500">{r.recordedBy}</span> },
  ];

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <SectionHeader
            title="Uniform Sales"
            subtitle={rows.length > 0
              ? `${rows.length} line${rows.length !== 1 ? 's' : ''} · ${totalQty} items · ${formatCurrency(totalRevenue)}`
              : 'Filter and load'}
          />
        </div>
        {rows.length > 0 && (
          <Button icon={faPrint} variant="secondary" size="sm" onClick={handlePrint}>Print</Button>
        )}
      </div>

      {/* Filters */}
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
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Academic Year</label>
            <select value={academicYearId} onChange={e => setAcademicYearId(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5">
              <option value="">All years</option>
              {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Grade</label>
            <select value={gradeId} onChange={e => setGradeId(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5">
              <option value="">All grades</option>
              {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <Button size="sm" onClick={load} loading={loading}>Load</Button>
        </div>
      </Card>

      {/* Summary cards */}
      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { l: 'Total Revenue',    v: formatCurrency(totalRevenue), c: 'text-emerald-600' },
              { l: 'Items Sold',       v: totalQty,                     c: 'text-slate-800'  },
              { l: 'Transactions',     v: new Set(rows.map(r => r.paymentId)).size, c: 'text-slate-800' },
              { l: 'Students',         v: new Set(rows.map(r => r.studentId)).size, c: 'text-slate-800' },
            ].map(({ l, v, c }) => (
              <Card key={l}><p className="text-xs text-slate-500 mb-1">{l}</p><p className={`text-xl font-bold ${c}`}>{v}</p></Card>
            ))}
          </div>

          {/* By-item breakdown */}
          <Card>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Sales by Item</p>
            <div className="flex flex-wrap gap-3">
              {byItem.map(item => (
                <div key={item.name} className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
                  <span className="text-sm font-semibold text-indigo-800">{item.name}</span>
                  <span className="text-xs text-indigo-500">×{item.qty}</span>
                  <span className="text-sm font-bold text-emerald-700">{formatCurrency(item.revenue)}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      <Table
        columns={COLS}
        data={rows}
        loading={loading}
        emptyMessage="No uniform sales found. Adjust filters and click Load."
        emptyIcon={faShirt}
      />
    </div>
  );
}
