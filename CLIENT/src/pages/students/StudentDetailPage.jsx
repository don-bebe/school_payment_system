import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faPen,
  faMoneyBillWave,
  faTrash,
  faPrint,
  faUsers,
  faSliders,
} from "@fortawesome/free-solid-svg-icons";
import {
  useAppDispatch,
  useAppSelector,
  useToast,
  usePermission,
} from "../../hooks";
import {
  fetchStudentById,
  selectSelectedStudent,
  deactivateStudent,
} from "../../store/slices/studentsSlice";
import { fetchActiveYear, selectActiveYear } from "../../store/slices/academicSlice";
import {
  fetchStudentPayments,
  selectPaymentList,
} from "../../store/slices/paymentsSlice";
import { Card, CardHeader } from "../../components/ui/Card";
import { StatusBadge, Badge, Avatar } from "../../components/ui/Badge";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { Spinner } from "../../components/feedback/Loading";
import {
  formatCurrency,
  formatDate,
  fullName,
} from "../../utils/formatters";
import { ROUTES } from "../../utils/constants";
import { studentsApi, paymentsApi, feeOverridesApi, academicApi } from "../../api/services";

const DEACTIVATE_REASONS = [
  { value: 'Transferred', label: 'Transferred to another school' },
  { value: 'Deceased',    label: 'Deceased'                      },
  { value: 'Graduated',   label: 'Graduated'                     },
];

export default function StudentDetailPage() {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const student = useAppSelector(selectSelectedStudent);
  const payments = useAppSelector(selectPaymentList);
  const canEdit = usePermission(["Admin", "Receptionist"]);
  const canDelete = usePermission(["Admin"]);
  const [confirm,  setConfirm]  = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deactReason, setDeactReason] = useState('Transferred');
  const [deactNotes,  setDeactNotes]  = useState('');
  const [siblings,    setSiblings]    = useState([]);
  const activeYear = useAppSelector(selectActiveYear);

  // Delete payment state
  const [deletePaymentModal, setDeletePaymentModal] = useState(false);
  const [selectedPayment,    setSelectedPayment]    = useState(null);
  const [deleteReason,       setDeleteReason]       = useState('');
  const [deletingPayment,    setDeletingPayment]    = useState(false);

  // Fee override state
  const [overrideModal,  setOverrideModal]  = useState(false);
  const [overrides,      setOverrides]      = useState([]);
  const [overrideTermMonths, setOverrideTermMonths] = useState([]);
  const [overrideForm,   setOverrideForm]   = useState({
    termMonthId: '', overrideTuitionAmount: '', forceStaffChildRate: false, reason: ''
  });
  const [savingOverride, setSavingOverride] = useState(false);

  useEffect(() => {
    dispatch(fetchStudentById(Number(id)));
    dispatch(fetchStudentPayments({ id: Number(id), params: {} }));
    dispatch(fetchActiveYear());
  }, [dispatch, id]);

  // Load sibling group whenever student or activeYear changes
  useEffect(() => {
    if (!student?.guardianGroupId || !activeYear?.id) { setSiblings([]); return; }
    studentsApi.getGroup(student.guardianGroupId, activeYear.id)
      .then(r => setSiblings(r?.data?.data ?? r?.data ?? []))
      .catch(() => setSiblings([]));
  }, [student?.guardianGroupId, activeYear?.id]);

  // Load overrides and term months when modal opens
  const openOverrideModal = async () => {
    if (!activeYear?.id) return;
    try {
      const [overridesRes, termsRes] = await Promise.all([
        feeOverridesApi.get(Number(id), activeYear.id),
        academicApi.getTermsByYear(activeYear.id),
      ]);
      setOverrides(overridesRes?.data?.data ?? overridesRes?.data ?? []);

      // Load months for the active term
      const terms = termsRes?.data?.data ?? termsRes?.data ?? [];
      const activeTerm = terms.find(t => t.isActive) ?? terms[0];
      if (activeTerm) {
        const monthsRes = await academicApi.getTermMonths(activeTerm.id);
        setOverrideTermMonths(
          (monthsRes?.data?.data ?? monthsRes?.data ?? [])
            .sort((a, b) => a.sortOrder - b.sortOrder)
        );
      } else {
        setOverrideTermMonths([]);
      }
    } catch {
      setOverrides([]);
      setOverrideTermMonths([]);
    }
    setOverrideModal(true);
  };

  const handleSaveOverride = async () => {
    if (!overrideForm.reason.trim()) { toast.error('Please enter a reason.'); return; }
    setSavingOverride(true);
    try {
      await feeOverridesApi.create({
        studentId:             Number(id),
        academicYearId:        activeYear.id,
        termMonthId:           overrideForm.termMonthId ? Number(overrideForm.termMonthId) : null,
        overrideTuitionAmount: overrideForm.overrideTuitionAmount !== '' ? Number(overrideForm.overrideTuitionAmount) : null,
        forceStaffChildRate:   overrideForm.forceStaffChildRate,
        reason:                overrideForm.reason,
      });
      toast.success('Fee override saved.');
      const res = await feeOverridesApi.get(Number(id), activeYear.id);
      setOverrides(res?.data?.data ?? res?.data ?? []);
      setOverrideForm({ termMonthId: '', overrideTuitionAmount: '', forceStaffChildRate: false, reason: '' });
    } catch { toast.error('Failed to save override.'); }
    setSavingOverride(false);
  };

  const handleDeleteOverride = async (overrideId) => {
    try {
      await feeOverridesApi.delete(overrideId);
      toast.success('Override removed.');
      setOverrides(prev => prev.filter(o => o.id !== overrideId));
    } catch { toast.error('Failed to remove override.'); }
  };

  const handleDeletePayment = async () => {
    if (!selectedPayment) return;
    setDeletingPayment(true);
    try {
      await paymentsApi.delete(selectedPayment.id, deleteReason || undefined);
      toast.success('Payment deleted. Balances restored.');
      dispatch(fetchStudentPayments({ id: Number(id), params: {} }));
      setDeletePaymentModal(false);
      setSelectedPayment(null);
      setDeleteReason('');
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Failed to delete payment.');
    }
    setDeletingPayment(false);
  };

  const handleDeactivate = async () => {
    setDeleting(true);
    const res = await dispatch(deactivateStudent({
      id:     Number(id),
      reason: deactReason,
      notes:  deactNotes.trim() || undefined,
    }));
    if (deactivateStudent.fulfilled.match(res)) {
      toast.success("Student deactivated.");
      navigate(ROUTES.STUDENTS);
    } else {
      toast.error("Failed to deactivate student.");
    }
    setDeleting(false);
    setConfirm(false);
  };

  const PAYMENT_COLS = [
    {
      key: "paymentDate",
      label: "Date",
      render: (r) => formatDate(r.paymentDate),
    },
    { key: "termName", label: "Term" },
    {
      key: "breakdowns",
      label: "Items paid",
      render: (r) => {
        const lines = r.breakdowns ?? r.breakdown ?? [];
        const paid = lines.filter(b => Number(b.amountPaid ?? 0) > 0);
        if (!paid.length) return <span className="text-slate-400 text-xs">—</span>;
        // Show first 2 labels, then "+ N more"
        const visible = paid.slice(0, 2);
        const extra   = paid.length - visible.length;
        return (
          <div className="space-y-0.5">
            {visible.map((b, i) => (
              <p key={i} className="text-xs text-slate-600 truncate max-w-[160px]" title={b.label}>
                {b.label}
              </p>
            ))}
            {extra > 0 && <p className="text-xs text-slate-400">+{extra} more</p>}
          </div>
        );
      },
    },
    {
      key: "amountPaid",
      label: "Amount",
      align: "right",
      render: (r) => (
        <div className="text-right">
          <span className={r.paymentMethodCode === "PREPAYMENT" ? "text-amber-600" : ""}>
            {r.paymentMethodCode === "PREPAYMENT" && r.amountPaid === 0
              ? <span className="text-xs text-slate-400 italic">In-kind</span>
              : formatCurrency(r.amountPaid, r.currency)
            }
          </span>
          {r.currency === 'ZIG' && (
            <p className="text-xs text-slate-400">≈ {formatCurrency(r.amountUsd ?? 0)}</p>
          )}
        </div>
      ),
    },
    {
      key: "paymentMethodName",
      label: "Method",
      render: (r) => (
        <div>
          <span className="text-sm">{r.paymentMethodName ?? r.methodName ?? "—"}</span>
          {r.reference && (
            <p className="text-xs text-slate-400 truncate max-w-[100px]" title={r.reference}>{r.reference}</p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      align: "center",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "receipt",
      label: "Receipt",
      align: "center",
      render: (r) => (
        <Link to={`/payments/${r.id}/receipt`} className="text-blue-500 hover:underline text-xs flex items-center justify-center gap-1">
          <FontAwesomeIcon icon={faPrint} className="text-xs" /> Print
        </Link>
      ),
    },
    ...(canDelete ? [{
      key: "delete",
      label: "",
      align: "center",
      render: (r) => (
        <button
          onClick={(e) => { e.stopPropagation(); setSelectedPayment(r); setDeletePaymentModal(true); }}
          className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50 transition-colors"
          title="Delete payment (restores balances)"
        >
          <FontAwesomeIcon icon={faTrash} />
        </button>
      ),
    }] : []),
  ];

  if (!student)
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors mt-1"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">
            {fullName(student)}
          </h1>
          <p className="text-sm text-slate-500">{student.studentNumber}</p>
        </div>
        {canEdit && (
          <div className="flex gap-2 flex-wrap justify-end">
            <Button
              size="sm"
              variant="secondary"
              icon={faPrint}
              onClick={() => navigate(`/reports/statement/${id}`)}
            >
              Statement
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={faMoneyBillWave}
              onClick={() => navigate(`/payments/new?studentId=${id}`)}
            >
              Record Payment
            </Button>
            {canDelete && (
              <Button
                size="sm"
                variant="secondary"
                icon={faSliders}
                onClick={openOverrideModal}
              >
                Fee Overrides
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              icon={faPen}
              onClick={() => navigate(`/students/${id}/edit`)}
            >
              Edit
            </Button>
            {canDelete && (
              <Button
                size="sm"
                variant="danger"
                icon={faTrash}
                onClick={() => setConfirm(true)}
              >
                Deactivate
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Profile */}
        <Card className="lg:col-span-1 h-fit">
          <div className="flex flex-col items-center text-center py-4 mb-4">
            <Avatar name={fullName(student)} size="xl" className="mb-3" />
            <h2 className="font-bold text-slate-900">{fullName(student)}</h2>
            <p className="text-sm text-slate-500 mb-2">
              {student.studentNumber}
            </p>
            <Badge variant={student.isActive ? "green" : "slate"}>
              {student.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="space-y-2 text-sm">
            {[
              { label: "Grade",       value: student.gradeName ?? "—" },
              {
                label: "Date of Birth",
                value: formatDate(student.dateOfBirth),
              },
              { label: "Gender",    value: student.gender ?? "—" },
              { label: "Enrolled",  value: formatDate(student.enrollmentDate) },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex justify-between border-b border-slate-50 pb-2"
              >
                <span className="text-slate-500">{label}</span>
                <span className="font-medium text-slate-800">{value}</span>
              </div>
            ))}
          </div>

          {/* Fee rule badges */}
          <div className="mt-3 flex flex-wrap gap-2">
            {student.isStaffChild && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                Staff Child Rate
              </span>
            )}
            {student.guardianGroupId && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                Group #{student.guardianGroupId}
              </span>
            )}
            {student.owesAdmissionFee && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                Admission Fee Owing
              </span>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-3">
              Guardian
            </p>
            <div className="space-y-1.5 text-sm">
              <p className="font-medium text-slate-800">
                {student.guardianName}
              </p>
              <p className="text-slate-500">{student.guardianPhone}</p>
              {student.guardianEmail && (
                <p className="text-slate-500">{student.guardianEmail}</p>
              )}
              {student.address && (
                <p className="text-slate-400 text-xs">{student.address}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Sibling / Family Group panel */}
        {siblings.length > 0 && (
          <Card className="lg:col-span-1 h-fit">
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faUsers} className="text-blue-500" />
                  Family Group #{student.guardianGroupId}
                </span>
              }
              subtitle={
                siblings.length >= 3
                  ? `${siblings.length} siblings — highest grade gets discounted fees`
                  : `${siblings.length} siblings — 3 needed to trigger discount`
              }
            />
            <div className="space-y-2">
              {siblings.map(s => (
                <div
                  key={s.studentId}
                  onClick={() => navigate(ROUTES.STUDENT(s.studentId))}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors
                    ${s.studentId === student.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-slate-50'}`}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-600">
                    {s.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {s.fullName}
                      {s.studentId === student.id && (
                        <span className="ml-1 text-xs text-blue-500">(this student)</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">{s.gradeName}</p>
                  </div>
                  {s.getsDiscount && (
                    <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      Discounted
                    </span>
                  )}
                </div>
              ))}
            </div>
            {siblings.length < 3 && (
              <p className="mt-3 text-xs text-slate-400 border-t border-slate-100 pt-3">
                Enrol {3 - siblings.length} more sibling{3 - siblings.length !== 1 ? 's' : ''} to unlock the sibling discount for the highest-grade child.
              </p>
            )}
          </Card>
        )}

        {/* Payment history */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader
              title="Payment History"
              subtitle={`${payments.length} payment${payments.length !== 1 ? "s" : ""} recorded`}
              action={
                canEdit && (
                  <Button
                    size="xs"
                    icon={faMoneyBillWave}
                    onClick={() => navigate(`/payments/new?studentId=${id}`)}
                  >
                    New Payment
                  </Button>
                )
              }
            />
            <Table
              columns={PAYMENT_COLS}
              data={payments}
              emptyMessage="No payments recorded yet."
              emptyIcon={faMoneyBillWave}
              onRowClick={(r) => navigate(`/payments/${r.id}/receipt`)}
            />
          </Card>

          {/* Deactivation info if inactive */}
          {!student.isActive && (
            <Card>
              <CardHeader title="Deactivation Details" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-500">Reason</span>
                  <span className="font-medium text-slate-800">{student.deactivationReason ?? '—'}</span>
                </div>
                {student.deactivatedAt && (
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="text-slate-500">Date</span>
                    <span className="font-medium text-slate-800">{formatDate(student.deactivatedAt)}</span>
                  </div>
                )}
                {student.deactivationNotes && (
                  <div className="flex justify-between pb-2">
                    <span className="text-slate-500">Notes</span>
                    <span className="font-medium text-slate-800 max-w-xs text-right">{student.deactivationNotes}</span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Deactivate modal — with reason + notes */}
      <Modal isOpen={confirm} onClose={() => setConfirm(false)} title="Deactivate Student">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            This will mark <strong>{fullName(student)}</strong> as inactive.
            All payment history will be preserved.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
            <select
              value={deactReason}
              onChange={e => setDeactReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {DEACTIVATE_REASONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
            <textarea
              value={deactNotes}
              onChange={e => setDeactNotes(e.target.value)}
              rows={2}
              placeholder="Any additional details…"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={handleDeactivate}>
              Deactivate
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Payment Modal */}
      <Modal
        isOpen={deletePaymentModal}
        onClose={() => { setDeletePaymentModal(false); setSelectedPayment(null); setDeleteReason(''); }}
        title="Delete Payment"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm text-red-800 font-medium">⚠️ This will permanently delete the payment and restore all fee balances.</p>
            <p className="text-xs text-red-600 mt-1">The student will be able to be billed again for the fees this payment covered.</p>
          </div>
          {selectedPayment && (
            <div className="text-sm space-y-1 bg-slate-50 rounded-xl p-3">
              <div className="flex justify-between"><span className="text-slate-500">Amount</span><span className="font-semibold">{formatCurrency(selectedPayment.amountPaid, selectedPayment.currency)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Date</span><span>{formatDate(selectedPayment.paymentDate)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Method</span><span>{selectedPayment.paymentMethodName ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status</span><span>{selectedPayment.status}</span></div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Reason for deletion (optional)</label>
            <input
              type="text"
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              placeholder="e.g. Entered incorrectly"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setDeletePaymentModal(false)}>Cancel</Button>
            <Button variant="danger" loading={deletingPayment} onClick={handleDeletePayment}>
              Delete & Restore Balances
            </Button>
          </div>
        </div>
      </Modal>

      {/* Fee Override Modal */}
      <Modal
        isOpen={overrideModal}
        onClose={() => setOverrideModal(false)}
        title="Fee Overrides"
        size="lg"
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            Set custom rates for this student — flat monthly amounts, sports-achievement monthly discounts,
            or redirect the sibling discount to this child.
          </p>

          {/* Existing overrides */}
          {overrides.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Active Overrides</p>
              {overrides.map(o => (
                <div key={o.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">
                      {o.termMonthName ? `${o.termMonthName} only` : 'Whole term'} —{' '}
                      {o.forceStaffChildRate && !o.overrideTuitionAmount ? 'Sibling discount assigned here' : ''}
                      {o.overrideTuitionAmount != null ? `Fixed rate: ${formatCurrency(o.overrideTuitionAmount)}` : ''}
                    </p>
                    <p className="text-xs text-slate-500">{o.reason}</p>
                  </div>
                  <button onClick={() => handleDeleteOverride(o.id)} className="text-red-400 hover:text-red-600 ml-4">
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* New override form */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Add New Override</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Scope</label>
                <select
                  value={overrideForm.termMonthId}
                  onChange={e => setOverrideForm(f => ({ ...f, termMonthId: e.target.value }))}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Whole term</option>
                  {overrideTermMonths.map(m => (
                    <option key={m.id} value={m.id}>{m.monthName} only</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-0.5">
                  {overrideForm.termMonthId ? 'Applies to selected month only' : 'Applies to all months this term'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Fixed Tuition Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={overrideForm.overrideTuitionAmount}
                  onChange={e => setOverrideForm(f => ({ ...f, overrideTuitionAmount: e.target.value }))}
                  placeholder="e.g. 25.00 or 0 for free"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <p className="text-xs text-slate-400 mt-0.5">Leave blank to use standard/staff rate</p>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={overrideForm.forceStaffChildRate}
                onChange={e => setOverrideForm(f => ({ ...f, forceStaffChildRate: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-blue-600"
              />
              <div>
                <span className="text-sm font-medium text-slate-700">Assign sibling discount to this child</span>
                <p className="text-xs text-slate-500">Overrides the default rule (highest-grade sibling). Use when a parent wants a lower-grade child to receive the discount.</p>
              </div>
            </label>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Reason <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={overrideForm.reason}
                onChange={e => setOverrideForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="e.g. Sports achievement — April, Special arrangement, Parent request"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOverrideModal(false)}>Close</Button>
            <Button loading={savingOverride} onClick={handleSaveOverride}>Save Override</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
