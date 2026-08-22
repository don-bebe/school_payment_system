import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft, faPrint, faUser, faChevronDown, faChevronUp,
  faReceipt, faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchActiveYear, selectActiveYear, fetchYears, selectYears } from '../../store/slices/academicSlice';
import { fetchSettings, selectSettings } from '../../store/slices/settingsSlice';
import { reportsApi} from '../../api/services';
import { formatCurrency } from '../../utils/formatters';
import { LOGO_CREST } from '../../assets/logoAssets';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/feedback/Loading';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadge(status) {
  const map = {
    Paid:    { bg: '#dcfce7', color: '#166534', text: 'PAID'    },
    Partial: { bg: '#fef9c3', color: '#854d0e', text: 'PARTIAL' },
    Unpaid:  { bg: '#fee2e2', color: '#991b1b', text: 'UNPAID'  },
  };
  const s = map[status] ?? { bg: '#f1f5f9', color: '#64748b', text: status };
  return (
    <span style={{
      fontSize: 8, fontWeight: 800, letterSpacing: '0.05em',
      padding: '1px 4px', borderRadius: 3,
      background: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>{s.text}</span>
  );
}

// ─── Printable Document ───────────────────────────────────────────────────────

function StatementDocument({ data, settings }) {
  const blue    = '#1e3a8a';
  const border1 = `1px solid ${blue}`;

  const schoolName    = settings?.schoolName    || 'ROCK OUT COLLEGE';
  const schoolMotto   = settings?.schoolMotto   || 'Patience, Perseverance & Prosperity';
  const schoolAddress = settings?.schoolAddress || '';
  const schoolCity    = settings?.schoolCity    || '';
  const schoolPhone   = settings?.schoolPhone   || '';
  const logoSrc       = settings?.schoolLogo    || LOGO_CREST;

  const totalPaid    = data.totalPaid ?? 0;
  const totalDue     = data.totalDue  ?? 0;
  const balance      = Math.max(0, totalDue - totalPaid);

  return (
    <div style={{
      width: '190mm', background: '#fff', color: blue,
      fontFamily: "'Arial', 'Helvetica', sans-serif",
      padding: '6mm 8mm', boxSizing: 'border-box', fontSize: 10,
    }}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
        <tbody>
          <tr>
            <td style={{ width: 56, verticalAlign: 'middle' }} />
            <td style={{ textAlign: 'center', padding: '0 4px' }}>
              <div style={{ fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em', color: blue }}>
                {schoolName}
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, marginTop: 2 }}>{schoolMotto}</div>
              <div style={{ fontSize: 8.5, marginTop: 1 }}>{schoolAddress}</div>
              <div style={{ fontSize: 8.5 }}>{schoolCity}{schoolPhone ? ` · Cell: ${schoolPhone}` : ''}</div>
              <div style={{ fontSize: 13, fontWeight: 900, marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                STUDENT FEE STATEMENT
              </div>
            </td>
            <td style={{ width: 56, verticalAlign: 'middle', textAlign: 'right' }}>
              <img src={logoSrc} alt="logo"
                style={{ width: 48, height: 48, objectFit: 'contain', display: 'block', marginLeft: 'auto' }} />
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ borderTop: `3px solid ${blue}`, borderBottom: `1px solid ${blue}`, margin: '0 0 5px' }} />

      {/* ── Student Info ────────────────────────────────────────────── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 5 }}>
        <tbody>
          <tr>
            <td style={{ fontSize: 10, padding: '2px 0', fontWeight: 600 }}>
              <strong>Name:</strong>&nbsp;{data.studentName}
            </td>
            <td style={{ fontSize: 10, padding: '2px 0', fontWeight: 600 }}>
              <strong>Student #:</strong>&nbsp;{data.studentNumber}
            </td>
            <td style={{ fontSize: 10, padding: '2px 0', fontWeight: 600 }}>
              <strong>Grade:</strong>&nbsp;{data.gradeName}
            </td>
            <td style={{ fontSize: 10, padding: '2px 0', fontWeight: 600 }}>
              <strong>Year:</strong>&nbsp;{data.academicYear}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Summary bar ─────────────────────────────────────────────── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: border1, marginBottom: 6, background: '#f0f4ff' }}>
        <tbody>
          <tr>
            <td style={{ padding: '4px 8px', fontWeight: 700, borderRight: border1 }}>
              Total Billed: <span style={{ color: blue }}>{formatCurrency(totalDue)}</span>
            </td>
            <td style={{ padding: '4px 8px', fontWeight: 700, borderRight: border1 }}>
              Total Paid: <span style={{ color: '#166534' }}>{formatCurrency(totalPaid)}</span>
            </td>
            <td style={{ padding: '4px 8px', fontWeight: 700 }}>
              Balance: <span style={{ color: balance > 0 ? '#991b1b' : '#166534' }}>
                {balance > 0 ? formatCurrency(balance) + ' OWING' : 'SETTLED'}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Transactions ────────────────────────────────────────────── */}
      {data.payments.map((pmt, pi) => {
        const isZig = pmt.currency === 'ZIG';
        return (
          <div key={pi} style={{ marginBottom: 6, border: border1, borderRadius: 3, overflow: 'hidden' }}>
            {/* Payment header row */}
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#e8eeff' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '3px 6px', fontWeight: 700, fontSize: 10 }}>
                    Receipt: <span style={{ color: '#dc2626' }}>{pmt.receiptNumber}</span>
                  </td>
                  <td style={{ padding: '3px 6px', fontSize: 10 }}>
                    {fmtDate(pmt.paymentDate)}
                  </td>
                  <td style={{ padding: '3px 6px', fontSize: 10 }}>
                    {pmt.termName}
                  </td>
                  <td style={{ padding: '3px 6px', fontSize: 10 }}>
                    Method: <strong>{pmt.paymentMethod}</strong>
                  </td>
                  <td style={{ padding: '3px 6px', fontSize: 10, textAlign: 'right', fontWeight: 700 }}>
                    {isZig
                      ? `ZIG ${Number(pmt.amountPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })} (≈ ${formatCurrency(pmt.amountUsd)})`
                      : formatCurrency(pmt.amountPaid)
                    }
                  </td>
                  <td style={{ padding: '3px 6px', fontSize: 9, color: '#64748b' }}>
                    by {pmt.recordedBy}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Breakdown lines */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {pmt.lines.filter(l => l.amountPaid > 0 || l.amountDue > 0).map((line, li) => (
                  <tr key={li} style={{ borderTop: `1px dotted ${blue}` }}>
                    <td style={{ padding: '2px 10px', fontSize: 9, color: blue }}>
                      {line.label}
                    </td>
                    <td style={{ padding: '2px 4px', fontSize: 9, textAlign: 'right', color: '#475569' }}>
                      due: {formatCurrency(line.amountDue)}
                    </td>
                    <td style={{ padding: '2px 8px', fontSize: 9, textAlign: 'right', fontWeight: 700, color: blue }}>
                      paid: {formatCurrency(line.amountPaid)}
                    </td>
                    <td style={{ padding: '2px 8px', width: 55 }}>
                      {statusBadge(line.status)}
                    </td>
                  </tr>
                ))}
                {/* Uniform sub-lines */}
                {pmt.uniformLines?.map((u, ui) => (
                  <tr key={`u${ui}`} style={{ borderTop: `1px dotted #cbd5e1` }}>
                    <td colSpan={3} style={{ padding: '2px 20px', fontSize: 9, color: '#475569', fontStyle: 'italic' }}>
                      {u.itemName} ×{u.quantity} @ {formatCurrency(u.unitPrice)} = {formatCurrency(u.totalPrice)}
                    </td>
                    <td />
                  </tr>
                ))}
                {/* ZIG note */}
                {isZig && pmt.zigRateUsed && (
                  <tr style={{ borderTop: `1px solid #d97706`, background: '#fffbeb' }}>
                    <td colSpan={4} style={{ padding: '2px 10px', fontSize: 8.5, color: '#92400e' }}>
                      ZiG Payment: ZIG {Number(pmt.amountPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      &nbsp;÷&nbsp;{Number(pmt.zigRateUsed).toFixed(4)} ZiG/USD
                      &nbsp;= USD {Number(pmt.amountUsd).toFixed(2)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })}

      {data.payments.length === 0 && (
        <div style={{ textAlign: 'center', padding: '12px', color: '#64748b', fontSize: 10 }}>
          No payments recorded for this period.
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${blue}`, marginTop: 8, paddingTop: 4, textAlign: 'center', fontSize: 9, color: blue }}>
        Printed: {new Date().toLocaleString('en-GB')} — {schoolName}
      </div>
    </div>
  );
}

// ─── Build print HTML ─────────────────────────────────────────────────────────

function buildPrintHtml(docHtml, settings) {
  const name = (settings?.schoolName || 'School').replace(/</g, '&lt;');
  return (
    '<!DOCTYPE html>' +
    '<html><head>' +
    '<meta charset="utf-8" />' +
    '<title>Fee Statement \u2014 ' + name + '</title>' +
    '<style>' +
    '* { box-sizing: border-box; margin: 0; padding: 0; }' +
    'body { background: #fff; font-family: Arial, Helvetica, sans-serif;' +
    ' -webkit-print-color-adjust: exact; print-color-adjust: exact; }' +
    '@page { size: A4 portrait; margin: 10mm; }' +
    '@media print { body { margin: 0; } }' +
    '</style>' +
    '</head><body>' +
    docHtml +
    '<script>' +
    'window.onload = function() { window.focus(); window.print(); setTimeout(function(){ window.close(); }, 500); };' +
    '</script>' +
    '</body></html>'
  );
}

// ─── Screen payment card ──────────────────────────────────────────────────────

function PaymentCard({ pmt }) {
  const [open, setOpen] = useState(false);
  const isZig = pmt.currency === 'ZIG';

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 text-left"
      >
        <FontAwesomeIcon icon={faReceipt} className="text-blue-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-red-600">{pmt.receiptNumber}</span>
            <span className="text-xs text-slate-500">{fmtDate(pmt.paymentDate)}</span>
            <span className="text-xs text-slate-400">{pmt.termName}</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{pmt.paymentMethod}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-slate-800">
            {isZig
              ? `ZIG ${Number(pmt.amountPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              : formatCurrency(pmt.amountPaid)
            }
          </p>
          {isZig && (
            <p className="text-xs text-amber-600">≈ {formatCurrency(pmt.amountUsd)} USD</p>
          )}
        </div>
        <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} className="text-slate-400 text-xs flex-shrink-0" />
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
          <table className="w-full text-xs">
            <tbody>
              {pmt.lines.filter(l => l.amountPaid > 0 || l.amountDue > 0).map((line, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-1 text-slate-700">{line.label}</td>
                  <td className="py-1 text-slate-400 text-right pr-4">due {formatCurrency(line.amountDue)}</td>
                  <td className="py-1 font-semibold text-slate-800 text-right pr-4">paid {formatCurrency(line.amountPaid)}</td>
                  <td className="py-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      line.status === 'Paid'    ? 'bg-emerald-100 text-emerald-700' :
                      line.status === 'Partial' ? 'bg-amber-100 text-amber-700' :
                                                   'bg-red-100 text-red-700'
                    }`}>
                      {line.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
              {pmt.uniformLines?.map((u, i) => (
                <tr key={`u${i}`} className="border-b border-slate-100">
                  <td className="py-1 pl-4 text-slate-500 italic" colSpan={3}>
                    {u.itemName} ×{u.quantity} @ {formatCurrency(u.unitPrice)} = {formatCurrency(u.totalPrice)}
                  </td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
          {isZig && pmt.zigRateUsed && (
            <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              ZiG {Number(pmt.amountPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              &nbsp;÷&nbsp;{Number(pmt.zigRateUsed).toFixed(4)} ZiG/USD
              &nbsp;= USD {Number(pmt.amountUsd).toFixed(2)}
            </div>
          )}
          <p className="mt-2 text-xs text-slate-400">Recorded by: {pmt.recordedBy}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudentStatementPage() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const [params]    = useSearchParams();
  const dispatch    = useAppDispatch();
  const activeYear  = useAppSelector(selectActiveYear);
  const years       = useAppSelector(selectYears);
  const settings    = useAppSelector(selectSettings);

  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [yearId,    setYearId]    = useState(null);
  const [printing,  setPrinting]  = useState(false);

  const docRef = useRef(null);

  // initialise yearId from query param or active year
  useEffect(() => {
    dispatch(fetchActiveYear());
    dispatch(fetchSettings());
    dispatch(fetchYears());
  }, [dispatch]);

  useEffect(() => {
    const qy = params.get('yearId');
    if (qy) { setYearId(Number(qy)); return; }
    if (activeYear?.id) setYearId(activeYear.id);
  }, [activeYear, params]);

  useEffect(() => {
    if (!id || !yearId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    reportsApi.getStudentStatement(Number(id), yearId)
      .then(r => {
        if (!cancelled) setData(r?.data?.data ?? r?.data ?? null);
      })
      .catch(e => { if (!cancelled) setError(e?.message ?? 'Failed to load statement.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, yearId]);

  const handlePrint = async () => {
    if (!docRef.current) return;
    setPrinting(true);
    try {
      const html = buildPrintHtml(docRef.current.innerHTML, settings);
      if (window.electronAPI?.printHtml) {
        await window.electronAPI.printHtml(html);
      } else {
        const win = window.open('', '_blank', 'width=900,height=700');
        if (win) { win.document.write(html); win.document.close(); }
        else window.print();
      }
    } finally {
      setPrinting(false);
    }
  };

  const balance  = data ? Math.max(0, (data.totalDue ?? 0) - (data.totalPaid ?? 0)) : 0;

  return (
    <div className="max-w-4xl mx-auto pb-10">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900">
            {data ? `${data.studentName} — Fee Statement` : 'Fee Statement'}
          </h1>
          {data && (
            <p className="text-sm text-slate-500">{data.studentNumber} · {data.gradeName}</p>
          )}
        </div>

        {/* Year selector */}
        {years?.length > 0 && (
          <select
            value={yearId ?? ''}
            onChange={e => setYearId(Number(e.target.value))}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {years.map(y => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
        )}

        <Button icon={faPrint} onClick={handlePrint} loading={printing} disabled={!data || loading}>
          Print Statement
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <Spinner size="xl" />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
          <FontAwesomeIcon icon={faExclamationTriangle} />
          {error}
        </div>
      )}

      {data && !loading && (<>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Total Billed</p>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(data.totalDue)}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Total Paid</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(data.totalPaid)}</p>
          </div>
          <div className={`border rounded-xl p-4 text-center ${balance > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-slate-500">Balance</p>
            <p className={`text-2xl font-bold ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {balance > 0 ? formatCurrency(balance) : 'SETTLED'}
            </p>
            {balance > 0 && <p className="text-xs text-red-500 mt-0.5">OWING</p>}
          </div>
        </div>

        {/* Payment list */}
        <div className="space-y-2">
          {data.payments.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FontAwesomeIcon icon={faUser} className="text-3xl mb-3 block mx-auto" />
              No payments recorded for {data.academicYear}.
            </div>
          ) : (
            data.payments.map((pmt, i) => <PaymentCard key={i} pmt={pmt} />)
          )}
        </div>
      </>)}

      {/* Hidden printable doc */}
      {data && (
        <div className="hidden">
          <div ref={docRef}>
            <StatementDocument data={data} settings={settings} />
          </div>
        </div>
      )}
    </div>
  );
}