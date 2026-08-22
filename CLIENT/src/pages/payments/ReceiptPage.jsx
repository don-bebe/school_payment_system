import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPrint, faArrowLeft, faRotateRight, faPen } from "@fortawesome/free-solid-svg-icons";
import { useAppDispatch, useAppSelector, useToast } from "../../hooks";
import { fetchReceipt, markReceiptPrinted, selectReceipt } from "../../store/slices/paymentsSlice";
import { fetchSettings, selectSettings } from "../../store/slices/settingsSlice";
import { selectCurrentUser } from "../../store/slices/authSlice";
import { LOGO_CREST } from "../../assets/logoAssets";
import { Spinner } from "../../components/feedback/Loading";
import Button from "../../components/ui/Button";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function splitAmount(amount) {
  const n = Math.abs(Number(amount ?? 0));
  const d = Math.floor(n);
  const c = Math.round((n - d) * 100);
  return { dollars: d.toLocaleString("en-US"), cents: String(c).padStart(2, "0") };
}

function toWords(n) {
  if (!n || n === 0) return "Zero";
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const chunk = (num) => {
    if (num === 0) return "";
    if (num < 20) return ones[num] + " ";
    if (num < 100) return tens[Math.floor(num/10)] + (num%10 ? "-"+ones[num%10] : "") + " ";
    return ones[Math.floor(num/100)] + " Hundred " + chunk(num%100);
  };
  const M = Math.floor(n/1_000_000), T = Math.floor((n%1_000_000)/1000), R = n%1000;
  return ((M ? chunk(M)+"Million " : "") + (T ? chunk(T)+"Thousand " : "") + chunk(R)).trim();
}

function amountInWords(amount) {
  const n = Number(amount ?? 0);
  const d = Math.floor(n), c = Math.round((n - d) * 100);
  let w = toWords(d) + " Dollar" + (d !== 1 ? "s" : "");
  if (c > 0) w += " and " + toWords(c) + " Cent" + (c !== 1 ? "s" : "");
  return w + " Only";
}

// ─── Dotted underline span ────────────────────────────────────────────────────

const DotFill = ({ value = "", minW = 80, fz = 10 }) => (
  <span style={{ display:"inline-block", borderBottom:"1px dotted #1e3a8a", minWidth:minW, marginLeft:3, verticalAlign:"bottom", fontWeight:500, fontSize:fz, lineHeight:1.6 }}>
    {value}&nbsp;
  </span>
);

// ─── Single fee row ───────────────────────────────────────────────────────────

function ItemRow({ label, amountPaid, status, colW, colW2, fz }) {
  const blue = "#1e3a8a", border = "1px solid #1e3a8a";
  const hasPaid = Number(amountPaid ?? 0) > 0;
  const { dollars, cents } = hasPaid ? splitAmount(amountPaid) : { dollars:"", cents:"" };
  const ss = { Paid:{bg:"#dcfce7",color:"#166534",text:"PAID"}, Partial:{bg:"#fef9c3",color:"#854d0e",text:"PARTIAL"}, Unpaid:{bg:"#fee2e2",color:"#991b1b",text:"UNPAID"}, NotApplicable:{bg:"#f1f5f9",color:"#64748b",text:"N/A"} }[status] ?? null;
  const numFz = Math.min(fz + 1, 11);
  return (
    <tr style={{ borderBottom: border }}>
      <td style={{ padding:"2px 0", fontSize:fz, color:blue, fontWeight:600 }}>
        <div style={{ display:"flex", alignItems:"flex-end" }}>
          <span style={{ whiteSpace:"nowrap", paddingLeft:5 }}>{label}:</span>
          <span style={{ flex:1, borderBottom:"1px dotted "+blue, minHeight:14, marginLeft:3, marginRight:2 }} />
          {ss && <span style={{ fontSize:7, fontWeight:800, letterSpacing:"0.05em", padding:"1px 4px", borderRadius:3, marginRight:4, background:ss.bg, color:ss.color, whiteSpace:"nowrap" }}>{ss.text}</span>}
        </div>
      </td>
      <td style={{ fontSize:numFz, fontFamily:"'Courier New',Courier,monospace", fontWeight:700, color:blue, textAlign:"right", padding:"2px 3px", borderLeft:border, width:colW, minWidth:colW, verticalAlign:"middle" }}>{dollars}</td>
      <td style={{ fontSize:numFz, fontFamily:"'Courier New',Courier,monospace", fontWeight:700, color:blue, textAlign:"right", padding:"2px 3px", borderLeft:border, width:colW2, minWidth:colW2, verticalAlign:"middle" }}>{cents}</td>
    </tr>
  );
}

// ─── Receipt document — renders for both screen preview and print ──────────────

function ReceiptDocument({ r, settings, paper }) {
  const blue = "#1e3a8a", red = "#dc2626", b1 = "1px solid #1e3a8a";
  const isThermal = paper?.id === "thermal80" || paper?.id === "thermal58";
  const is58      = paper?.id === "thermal58";
  const docW      = paper?.docWidth ?? "148mm";

  // Font scale — increased across all formats
  const fs = {
    base:   isThermal ? (is58 ? 9    : 10)  : 12,
    school: isThermal ? (is58 ? 14   : 16)  : 26,
    rcpt:   isThermal ? (is58 ? 12   : 14)  : 26,
    tag:    isThermal ? (is58 ? 7.5  : 8.5) : 12,
    item:   isThermal ? (is58 ? 9    : 10)  : 12,
    total:  isThermal ? (is58 ? 12   : 13)  : 18,
    foot:   isThermal ? (is58 ? 9    : 10)  : 13,
    colW:   isThermal ? (is58 ? 28   : 32)  : 56,
    colW2:  isThermal ? (is58 ? 24   : 28)  : 40,
  };

  // DotFill minW values — increased to match larger font
  const dw = {
    dd:2*fs.base+4, mm:2*fs.base+4, yy:2*fs.base+6,
    name:  isThermal ? 72 : 180,
    grade: isThermal ? 32 : 55,
    year:  isThermal ? 36 : 70,
    snum:  isThermal ? 58 : 105,
    words: isThermal ? 90 : 160,
    term:  isThermal ? 44 : 95,
    meth:  isThermal ? 36 : 65,
    sig:   isThermal ? 58 : 105,
  };

  const sn  = settings?.schoolName    || "ROCK OUT COLLEGE";
  const sm  = settings?.schoolMotto   || "Patience, Perseverance & Prosperity";
  const sa  = settings?.schoolAddress || "Stand No. 5932 Stoneridge Phase 1";
  const sc  = settings?.schoolCity    || "Waterfalls, Harare";
  const sp  = settings?.schoolPhone   || "0774 065 625";
  const sf  = settings?.receiptFooter || "With Thanks";
  const logo= settings?.schoolLogo    || LOGO_CREST;

  const rn  = String(r.receiptNumber ?? "").replace(/[^0-9]/g,"") || String(r.receiptNumber ?? "");
  const dt  = r.issuedAt ? new Date(r.issuedAt) : new Date();
  const DD  = String(dt.getDate()).padStart(2,"0");
  const MM  = String(dt.getMonth()+1).padStart(2,"0");
  const YY  = String(dt.getFullYear()).slice(2);
  const { dollars:tD, cents:tC } = splitAmount(r.amountPaid ?? 0);
  const words = amountInWords(r.amountPaid ?? 0);

  const bd = r.breakdown ?? r.breakdowns ?? [];
  const ul = r.uniformLines ?? [];
  const uBd = bd.filter(b => b.label && b.label.includes("\u00d7") && ul.length && ul.some(u => b.label.startsWith(u.itemName)));
  const oBd = bd.filter(b => !uBd.includes(b));
  const uTot = uBd.reduce((s,b) => s + Number(b.amountPaid??0), 0);

  return (
    <div style={{ width:docW, maxWidth:docW, minHeight:"60mm", background:"#fff", color:blue, fontFamily:"Arial,Helvetica,sans-serif", padding:isThermal?"2mm 2mm 3mm":"4mm 5mm 4mm", boxSizing:"border-box", fontSize:fs.base, overflow:"hidden" }}>

      {/* Header */}
      {isThermal ? (
        <div style={{ textAlign:"center", marginBottom:3 }}>
          <div style={{ display:"flex", justifyContent:"center", alignItems:"baseline", gap:4, marginBottom:1 }}>
            <span style={{ fontSize:fs.tag, fontWeight:800, letterSpacing:"0.12em", textTransform:"uppercase", color:blue }}>RECEIPT</span>
            <span style={{ fontSize:fs.rcpt, fontWeight:900, color:red, fontFamily:"'Arial Black',Arial,sans-serif" }}>{rn}</span>
          </div>
          <div style={{ fontSize:fs.school, fontWeight:900, textTransform:"uppercase", letterSpacing:"0.02em", lineHeight:1.1, color:blue }}>{sn}</div>
          <div style={{ fontSize:fs.tag, fontWeight:700, marginTop:1, color:blue }}>{sm}</div>
          <div style={{ fontSize:fs.tag, marginTop:1, color:blue }}>{sa}</div>
          <div style={{ fontSize:fs.tag, color:blue }}>{sc} · Cell: {sp}</div>
        </div>
      ) : (
        <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:3 }}>
          <tbody><tr>
            <td style={{ width:48, verticalAlign:"middle" }} />
            <td style={{ textAlign:"center", verticalAlign:"top", padding:"0 4px" }}>
              <div style={{ display:"flex", justifyContent:"center", alignItems:"baseline", gap:8, marginBottom:1 }}>
                <span style={{ fontSize:10, fontWeight:800, letterSpacing:"0.18em", textTransform:"uppercase", color:blue }}>RECEIPT</span>
                <span style={{ fontSize:22, fontWeight:900, color:red, fontFamily:"'Arial Black',Arial,sans-serif", letterSpacing:"0.04em" }}>{rn}</span>
              </div>
              <div style={{ fontSize:22, fontWeight:900, textTransform:"uppercase", letterSpacing:"0.03em", lineHeight:1.05, color:blue }}>{sn}</div>
              <div style={{ fontSize:9, fontWeight:700, marginTop:2, color:blue }}>{sm}</div>
              <div style={{ fontSize:8.5, marginTop:2, color:blue }}>{sa}</div>
              <div style={{ fontSize:8.5, color:blue }}>{sc} · Cell: {sp}</div>
            </td>
            <td style={{ width:48, verticalAlign:"middle", textAlign:"right" }}>
              <img src={logo} alt="logo" style={{ width:44, height:44, objectFit:"contain", display:"block", marginLeft:"auto" }} />
            </td>
          </tr></tbody>
        </table>
      )}

      {/* Divider */}
      <div style={{ borderTop:"3px solid "+blue, borderBottom:"1px solid "+blue, margin:"0 0 4px" }} />

      {/* Student info */}
      <div style={{ fontSize:fs.base, lineHeight:isThermal?1.55:1.85, marginBottom:4 }}>
        <div style={{ display:"flex", alignItems:"flex-end", flexWrap:"wrap" }}>
          <span style={{ fontWeight:700, marginRight:2, whiteSpace:"nowrap" }}>Date:</span>
          <DotFill value={DD} minW={dw.dd} fz={fs.base} />
          <span style={{ fontWeight:700, margin:"0 2px" }}>/</span>
          <DotFill value={MM} minW={dw.mm} fz={fs.base} />
          <span style={{ fontWeight:700, margin:"0 2px" }}>/20</span>
          <DotFill value={YY} minW={dw.yy} fz={fs.base} />
        </div>
        <div style={{ display:"flex", alignItems:"flex-end", flexWrap:"wrap" }}>
          <span style={{ fontWeight:700, marginRight:2, whiteSpace:"nowrap" }}>Name:</span>
          <DotFill value={r.studentName} minW={dw.name} fz={fs.base} />
          <span style={{ fontWeight:700, margin:"0 2px 0 6px", whiteSpace:"nowrap" }}>Grade:</span>
          <DotFill value={r.gradeName} minW={dw.grade} fz={fs.base} />
        </div>
        <div style={{ display:"flex", alignItems:"flex-end", flexWrap:"wrap" }}>
          <span style={{ fontWeight:700, marginRight:2, whiteSpace:"nowrap" }}>Year:</span>
          <DotFill value={r.academicYear} minW={dw.year} fz={fs.base} />
          <span style={{ fontWeight:700, margin:"0 2px 0 6px", whiteSpace:"nowrap" }}>Student #:</span>
          <DotFill value={r.studentNumber} minW={dw.snum} fz={fs.base} />
        </div>
        <div style={{ display:"flex", alignItems:"flex-end", flexWrap:"wrap" }}>
          <span style={{ fontWeight:700, whiteSpace:"nowrap", marginRight:2 }}>Amount in words:</span>
          <DotFill value={words} minW={dw.words} fz={fs.base} />
        </div>
        <div style={{ borderBottom:"1px dotted "+blue, marginTop:-2, marginBottom:4 }} />
      </div>

      {/* Fee table */}
      <table style={{ width:"100%", borderCollapse:"collapse", border:b1, tableLayout:"fixed" }}>
        <thead>
          <tr style={{ borderBottom:b1 }}>
            <th style={{ textAlign:"left", fontWeight:700, fontSize:fs.item, padding:"2px 4px", color:blue }}>
              <span style={{ fontWeight:700 }}>Term:</span>
              <span style={{ display:"inline-block", borderBottom:"1px dotted "+blue, width:dw.term, marginLeft:3, verticalAlign:"bottom", fontSize:fs.item }}>&nbsp;{r.termName??""}</span>
              {isThermal
                ? <span style={{ marginLeft:6, fontSize:fs.item }}><span style={{ fontWeight:700 }}>Method:</span> {r.paymentMethod??""}</span>
                : <><span style={{ fontWeight:700, margin:"0 4px 0 8px" }}>Method:</span><span style={{ display:"inline-block", borderBottom:"1px dotted "+blue, width:dw.meth, marginLeft:3, verticalAlign:"bottom", fontSize:fs.item }}>&nbsp;{r.paymentMethod??""}</span></>
              }
            </th>
            <th style={{ textAlign:"center", fontWeight:900, fontSize:Math.min(fs.total,15), color:blue, borderLeft:b1, padding:"2px 3px", width:fs.colW }}>$</th>
            <th style={{ textAlign:"center", fontWeight:700, fontSize:Math.min(fs.total-2,13), fontStyle:"italic", color:blue, borderLeft:b1, padding:"2px 3px", width:fs.colW2 }}>c</th>
          </tr>
        </thead>
        <tbody>
          {!bd.length
            ? <ItemRow label="Tuition Fee" amountPaid={r.amountPaid} status="Paid" colW={fs.colW} colW2={fs.colW2} fz={fs.item} />
            : <>
                {oBd.map((b,i) => <ItemRow key={i} label={b.label} amountPaid={b.amountPaid} status={b.status} colW={fs.colW} colW2={fs.colW2} fz={fs.item} />)}
                {uBd.length > 0 && <>
                  <tr><td colSpan={3} style={{ fontSize:fs.item-1, fontWeight:700, padding:"2px 4px 1px", color:blue, borderTop:b1, background:"#f0f4ff", letterSpacing:"0.05em" }}>UNIFORM</td></tr>
                  {uBd.map((b,i) => (
                    <tr key={"u-"+i}>
                      <td style={{ fontSize:fs.item-1, padding:"1px 4px 1px 10px", color:"#334155" }}>{b.label}</td>
                      <td style={{ fontSize:fs.item-1, textAlign:"right", borderLeft:b1, padding:"1px 3px", color:"#059669" }}>{Number(b.amountPaid??0).toFixed(0)}</td>
                      <td style={{ fontSize:fs.item-1, textAlign:"right", borderLeft:b1, padding:"1px 3px", color:"#059669" }}>{((Number(b.amountPaid??0)%1)*100).toFixed(0).padStart(2,"0")}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ fontSize:fs.item-1, padding:"1px 4px", fontWeight:600, color:blue, textAlign:"right", fontStyle:"italic" }}>Uniform subtotal:</td>
                    <td style={{ fontSize:fs.item-1, textAlign:"right", borderLeft:b1, padding:"1px 3px", fontWeight:700, color:"#059669" }}>{Math.floor(uTot).toString()}</td>
                    <td style={{ fontSize:fs.item-1, textAlign:"right", borderLeft:b1, padding:"1px 3px", fontWeight:700, color:"#059669" }}>{((uTot%1)*100).toFixed(0).padStart(2,"0")}</td>
                  </tr>
                </>}
              </>
          }
          {/* Signature + Total */}
          <tr>
            <td style={{ fontSize:fs.item, padding:"4px 4px 3px", fontWeight:600, color:blue }}>
              <div style={{ display:"flex", alignItems:"center", gap:isThermal?3:6, flexWrap:"wrap" }}>
                <span style={{ whiteSpace:"nowrap" }}>Received by:</span>
                {r.issuedBySignature
                  ? <img src={r.issuedBySignature} alt="Signature" style={{ height:isThermal?18:28, maxWidth:dw.sig, objectFit:"contain", verticalAlign:"middle" }} />
                  : <span style={{ display:"inline-block", borderBottom:"1px dotted "+blue, width:dw.sig, verticalAlign:"bottom" }}>&nbsp;</span>
                }
                <span style={{ fontSize:fs.item-1, color:blue }}>{r.issuedByName}</span>
              </div>
            </td>
            <td colSpan={2} style={{ borderLeft:b1, padding:"3px 4px", textAlign:"right", verticalAlign:"middle" }}>
              <span style={{ fontSize:Math.max(fs.item-2,6.5), fontWeight:800, marginRight:3, color:blue, whiteSpace:"nowrap" }}>TOTAL ({r.currency??"USD"})</span>
              <span style={{ fontSize:fs.total, fontWeight:900, fontFamily:"'Arial Black','Courier New',monospace", color:blue }}>
                {tD}<span style={{ fontSize:fs.total-3, margin:"0 1px" }}>.</span>{tC}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Prepayment note */}
      {r.isPrepayment && r.prepaymentDescription && (
        <div style={{ marginTop:5, padding:"3px 5px", border:b1, borderRadius:3, fontSize:fs.item-0.5, color:blue }}>
          <span style={{ fontWeight:700 }}>In-Kind Contribution: </span>{r.prepaymentDescription}
        </div>
      )}

      {/* ZiG note */}
      {r.currency === "ZIG" && r.zigRateUsed && (
        <div style={{ marginTop:5, padding:"3px 5px", border:"1px solid #d97706", borderRadius:3, fontSize:fs.item-1, color:"#92400e", background:"#fffbeb" }}>
          <strong>ZiG Payment: </strong>
          ZiG {Number(r.amountPaid).toLocaleString(undefined,{minimumFractionDigits:2})}
          &nbsp;÷&nbsp;{Number(r.zigRateUsed).toFixed(4)} ZiG/USD&nbsp;=&nbsp;
          <strong>USD {Number(r.amountUsd??0).toFixed(2)}</strong>
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign:"center", marginTop:5 }}>
        <em style={{ fontSize:fs.foot, fontWeight:700, color:blue }}>{sf}</em>
      </div>
    </div>
  );
}

// ─── Paper sizes ──────────────────────────────────────────────────────────────

const PAPER_SIZES = [
  { id:"a5l",       label:"A5 Landscape",  css:"A5 landscape", margin:"6mm",  docWidth:"152mm" },
  { id:"a4p",       label:"A4 Portrait",   css:"A4 portrait",  margin:"10mm", docWidth:"195mm" },
  { id:"thermal80", label:"Thermal 80mm",  css:"80mm 297mm",   margin:"2mm",  docWidth:"76mm"  },
  { id:"thermal58", label:"Thermal 58mm",  css:"58mm 297mm",   margin:"1mm",  docWidth:"56mm"  },
];

function buildPrintHtml(receiptHtml, settings, paper = PAPER_SIZES[0]) {
  const sn = (settings?.schoolName || "ROCK OUT COLLEGE").replace(/</g,"&lt;");
  return (
    "<!DOCTYPE html><html><head>" +
    '<meta charset="utf-8" />' +
    "<title>Receipt \u2014 " + sn + "</title>" +
    "<style>" +
    "* { box-sizing:border-box; margin:0; padding:0; }" +
    "body { background:#fff; font-family:Arial,Helvetica,sans-serif;" +
    " -webkit-print-color-adjust:exact; print-color-adjust:exact;" +
    " width:" + paper.docWidth + "; max-width:" + paper.docWidth + "; overflow:hidden; }" +
    "@page { size:" + paper.css + "; margin:" + paper.margin + "; }" +
    "@media print { html,body { width:" + paper.docWidth + "; max-width:" + paper.docWidth + "; } }" +
    "img { max-width:100%; height:auto; }" +
    "table { table-layout:fixed; width:100%; }" +
    "td,th { overflow:hidden; word-break:break-word; }" +
    "</style></head><body>" +
    receiptHtml +
    "<script>window.onload=function(){window.focus();window.print();setTimeout(function(){window.close();},500);};</script>" +
    "</body></html>"
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReceiptPage() {
  const { id }   = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast    = useToast();
  const receipt  = useAppSelector(selectReceipt);
  const settings = useAppSelector(selectSettings);
  const currentUser = useAppSelector(selectCurrentUser);
  const [printing, setPrinting]         = useState(false);
  const docRef                          = useRef(null);
  const [readyToPrint, setReadyToPrint] = useState(false);
  const [paperId, setPaperId]           = useState("a5l");
  const selectedPaper = PAPER_SIZES.find(p => p.id === paperId) ?? PAPER_SIZES[0];

  useEffect(() => {
    dispatch(fetchReceipt(Number(id)));
    dispatch(fetchSettings());
  }, [dispatch, id]);

  useEffect(() => {
    if (!receipt) { setReadyToPrint(false); return; }
    const raf = requestAnimationFrame(() => {
      const t = setTimeout(() => { if (docRef.current) setReadyToPrint(true); }, 120);
      return () => clearTimeout(t);
    });
    return () => cancelAnimationFrame(raf);
  }, [receipt]);

  const handlePrint = async () => {
    if (!readyToPrint) { toast.error("Receipt is still loading — please wait a moment."); return; }
    setPrinting(true);
    try {
      await dispatch(markReceiptPrinted(Number(id)));
      const container = docRef.current;
      if (!container) { window.print(); return; }
      const html = buildPrintHtml(container.innerHTML, settings, selectedPaper);
      if (typeof window !== "undefined" && window.electronAPI?.printHtml) {
        const printed = await window.electronAPI.printHtml(html);
        if (printed) toast.success("Receipt sent to printer.");
        return;
      }
      const pw = window.open("","_blank","width=900,height=650");
      if (!pw) { window.print(); toast.success("Receipt printed."); return; }
      pw.document.write(html);
      pw.document.close();
      toast.success("Receipt sent to printer.");
    } catch (err) {
      toast.error("Print failed: " + (err?.message ?? "unknown error"));
    } finally {
      setPrinting(false);
    }
  };

  if (!receipt) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Spinner size="xl" />
      <p className="text-sm text-slate-500">Loading receipt…</p>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 max-w-3xl mx-auto flex-wrap">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h1 className="text-xl font-bold text-slate-900 flex-1">
          Receipt&nbsp;<span className="text-red-600 font-mono">#{String(receipt.receiptNumber??"").replace(/[^0-9]/g,"")||receipt.receiptNumber}</span>
        </h1>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {PAPER_SIZES.map(p => (
            <button key={p.id} type="button" onClick={() => setPaperId(p.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${paperId===p.id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {p.label}
            </button>
          ))}
        </div>
        <Button variant="secondary" icon={faRotateRight} size="sm" onClick={() => { setReadyToPrint(false); dispatch(fetchReceipt(Number(id))); }}>Refresh</Button>
        {currentUser?.role === 'Admin' && receipt?.status !== 'Reversed' && (
          <Button variant="secondary" icon={faPen} size="sm" onClick={() => navigate(`/payments/${id}/edit`)}>
            Edit
          </Button>
        )}
        <Button icon={faPrint} onClick={handlePrint} loading={printing} disabled={!readyToPrint}>
          {readyToPrint ? "Print Receipt" : "Loading…"}
        </Button>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 overflow-x-auto flex justify-center">
          <div ref={docRef}>
            <ReceiptDocument r={receipt} settings={settings} paper={selectedPaper} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500 px-1">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full inline-block ${receipt.isPrinted?"bg-emerald-400":"bg-amber-400"}`} />
            {receipt.isPrinted ? "Already printed" : "Not yet printed"}
          </span>
          <span>Issued by: <strong className="text-slate-700">{receipt.issuedByName}</strong></span>
          <span>Grade: <strong className="text-slate-700">{receipt.gradeName}</strong></span>
          <span>Year: <strong className="text-slate-700">{receipt.academicYear}</strong></span>
        </div>
      </div>
    </div>
  );
}