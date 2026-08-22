import { useCallback, useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faReceipt, faTrash, faTag, faCoins } from '@fortawesome/free-solid-svg-icons';
import { useAppDispatch, useAppSelector, useToast, usePermission } from '../../hooks';
import { fetchExpenses, createExpense, deleteExpense, fetchCategories, createCategory, selectExpenses, selectCategories } from '../../store/slices/expensesSlice';
import { fetchPaymentMethods, selectPaymentMethods } from '../../store/slices/paymentsSlice';
import { fetchActiveYear, selectActiveYear } from '../../store/slices/academicSlice';
import { validateExpenseForm } from '../../utils/validators';
import { CURRENCY_OPTIONS } from '../../utils/constants';
import { SectionHeader } from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Modal, { ConfirmModal } from '../../components/ui/Modal';
import { Input, Select, FormField, Textarea } from '../../components/forms/FormControls';
import { DateRangePicker } from '../../components/ui/SearchBar';
import Button from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency, formatDate, todayInputDate } from '../../utils/formatters';
import { paymentsApi } from '../../api/services';

const EMPTY_FORM = {
  description: '', amount: '', currency: 'USD',
  categoryId: '', paymentMethodId: '',
  reference: '', expenseDate: todayInputDate(), notes: '',
};

export default function ExpensesPage() {
  const dispatch    = useAppDispatch();
  const toast       = useToast();
  const expenses    = useAppSelector(selectExpenses);
  const categories  = useAppSelector(selectCategories);
  const methods     = useAppSelector(selectPaymentMethods);
  const activeYear  = useAppSelector(selectActiveYear);
  const isAdmin     = usePermission(['Admin']);
  const canDelete   = isAdmin;

  const [from, setFrom]             = useState(todayInputDate());
  const [to,   setTo]               = useState(todayInputDate());
  const [showForm,    setShowForm]   = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [form,   setForm]           = useState(EMPTY_FORM);
  const [catForm, setCatForm]       = useState({ name: '', description: '' });
  const [errors,    setErrors]      = useState({});
  const [catErrors, setCatErrors]   = useState({});
  const [saving,    setSaving]      = useState(false);
  const [catSaving, setCatSaving]   = useState(false);
  const [delId,     setDelId]       = useState(null);
  const [zigRate,   setZigRate]     = useState(null);

  const load = useCallback(() => {
    dispatch(fetchExpenses({ from, to }));
  }, [dispatch, from, to]);

  useEffect(() => {
    dispatch(fetchCategories());
    dispatch(fetchPaymentMethods());
    dispatch(fetchActiveYear());
    load();
    paymentsApi.getZigRate()
      .then(r => setZigRate(r?.data?.data ?? r?.data ?? null))
      .catch(() => setZigRate(null));
  }, [dispatch, load]);

  const set    = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setCat = (k) => (e) => setCatForm(f => ({ ...f, [k]: e.target.value }));

  const selectedMethod = methods.find(m => m.id === Number(form.paymentMethodId));

  // Correct totals — group by currency, never mix
  const totalUsd = expenses.filter(e => e.currency === 'USD').reduce((s, e) => s + (e.amountUsd ?? e.amount), 0);
  const totalZig = expenses.filter(e => e.currency === 'ZIG').reduce((s, e) => s + e.amount, 0);
  const totalZigAsUsd = expenses.filter(e => e.currency === 'ZIG').reduce((s, e) => s + (e.amountUsd ?? 0), 0);

  // USD equivalent preview for the form
  const zigPreviewUsd = form.currency === 'ZIG' && zigRate && parseFloat(form.amount) > 0
    ? (parseFloat(form.amount) / zigRate.ratePerUsd).toFixed(2)
    : null;

  // ── Record expense ──────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    const errs = validateExpenseForm(form);
    if (Object.values(errs).some(Boolean)) { setErrors(errs); return; }

    if (!activeYear?.id) {
      toast.error('No active academic year found. Please configure one in Academic Setup.');
      return;
    }

    if (form.currency === 'ZIG' && !zigRate) {
      toast.error('No ZiG rate configured. Please ask an administrator to set the current ZiG rate.');
      return;
    }

    setSaving(true);
    const res = await dispatch(createExpense({
      academicYearId:    activeYear.id,
      expenseCategoryId: Number(form.categoryId),
      paymentMethodId:   Number(form.paymentMethodId),
      amount:            Number(form.amount),
      currency:          form.currency,
      expenseDate:       form.expenseDate,
      description:       form.description,
      reference:         form.reference || null,
    }));
    setSaving(false);

    if (createExpense.fulfilled.match(res)) {
      toast.success('Expense recorded.');
      setShowForm(false);
      setForm(EMPTY_FORM);
      setErrors({});
      load();
    } else {
      toast.error(res.payload ?? 'Failed to record expense.');
    }
  };

  // ── Add category (Admin only) ───────────────────────────────────────────────
  const handleSaveCategory = async () => {
    if (!catForm.name.trim()) { setCatErrors({ name: 'Name is required.' }); return; }
    setCatSaving(true);
    const res = await dispatch(createCategory({ name: catForm.name.trim(), description: catForm.description || null }));
    setCatSaving(false);
    if (createCategory.fulfilled.match(res)) {
      toast.success(`Category "${catForm.name}" added.`);
      setShowCatForm(false);
      setCatForm({ name: '', description: '' });
      setCatErrors({});
    } else {
      toast.error(res.payload ?? 'Failed to add category.');
    }
  };

  // ── Delete expense ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    const res = await dispatch(deleteExpense(delId));
    if (deleteExpense.fulfilled.match(res)) toast.success('Expense deleted.');
    else toast.error('Failed to delete.');
    setDelId(null);
  };

  const COLS = [
    { key: 'expenseDate',  label: 'Date',        render: r => formatDate(r.expenseDate) },
    { key: 'description',  label: 'Description', render: r => <span className="font-medium">{r.description}</span> },
    { key: 'categoryName',      label: 'Category' },
    { key: 'paymentMethodName', label: 'Method'   },
    { key: 'currency',     label: 'CCY',      align: 'center' },
    { key: 'amount',       label: 'Amount',   align: 'right',
      render: r => (
        <div className="text-right">
          <span className="font-semibold">{formatCurrency(r.amount, r.currency)}</span>
          {r.currency === 'ZIG' && r.amountUsd > 0 && (
            <span className="block text-xs text-slate-400">≈ {formatCurrency(r.amountUsd, 'USD')}</span>
          )}
        </div>
      )},
    { key: 'actions',      label: '',         align: 'center',
      render: r => canDelete ? (
        <button onClick={(e) => { e.stopPropagation(); setDelId(r.id); }}
          className="text-red-400 hover:text-red-600 p-1 transition-colors">
          <FontAwesomeIcon icon={faTrash} className="text-xs" />
        </button>
      ) : null },
  ];

  // Subtitle showing correct per-currency totals
  const subtitleParts = [`USD ${totalUsd.toFixed(2)}`];
  if (totalZig > 0) subtitleParts.push(`ZiG ${totalZig.toLocaleString(undefined, { minimumFractionDigits: 2 })} (≈ USD ${totalZigAsUsd.toFixed(2)})`);

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Expenses"
        subtitle={`Total: ${subtitleParts.join(' + ')}`}
        actions={
          <div className="flex gap-2">
            {isAdmin && (
              <Button size="sm" variant="secondary" icon={faTag}
                onClick={() => setShowCatForm(true)}>
                Add Category
              </Button>
            )}
            <Button size="sm" icon={faPlus} onClick={() => setShowForm(true)}>
              Record Expense
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-3 items-center">
        <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
        <Button size="sm" variant="secondary" onClick={load}>Apply</Button>
      </div>

      <Table columns={COLS} data={expenses} emptyMessage="No expenses in this date range." emptyIcon={faReceipt} />

      {/* ── Record expense modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setForm(EMPTY_FORM); setErrors({}); }}
        title="Record Expense"
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save Expense</Button>
          </div>
        }
      >
        <form onSubmit={handleSave} noValidate className="space-y-4">
          <FormField label="Description" error={errors.description} required>
            <Input value={form.description} onChange={set('description')} error={errors.description} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Amount" error={errors.amount} required>
              <Input type="number" step="0.01" value={form.amount} onChange={set('amount')}
                error={errors.amount} placeholder="0.00" />
            </FormField>
            <FormField label="Currency" required>
              <Select options={CURRENCY_OPTIONS} value={form.currency} onChange={set('currency')} />
            </FormField>
          </div>

          {/* ZiG rate banner — shown when ZiG currency is selected */}
          {form.currency === 'ZIG' && (
            <div className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${
              zigRate ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <FontAwesomeIcon icon={faCoins} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                {zigRate ? (
                  <>
                    <p className="font-semibold">Rate: {Number(zigRate.ratePerUsd).toFixed(4)} ZiG = USD 1</p>
                    {zigPreviewUsd && (
                      <p className="text-xs mt-1 font-bold">
                        ZiG {Number(form.amount).toLocaleString()} ≈ USD {zigPreviewUsd}
                      </p>
                    )}
                    <p className="text-xs mt-0.5 opacity-70">USD equivalent will be stored for reporting</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">No ZiG rate configured</p>
                    <p className="text-xs mt-0.5">Ask an administrator to set the weekly ZiG rate before recording ZiG expenses.</p>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Category" error={errors.categoryId} required>
              <Select
                options={categories.map(c => ({ value: c.id, label: c.name }))}
                value={form.categoryId}
                onChange={set('categoryId')}
                error={errors.categoryId}
                placeholder="Select category"
              />
            </FormField>
            <FormField label="Payment Method" error={errors.paymentMethodId} required>
              <Select
                options={methods.map(m => ({ value: m.id, label: m.name }))}
                value={form.paymentMethodId}
                onChange={set('paymentMethodId')}
                error={errors.paymentMethodId}
                placeholder="Select method"
              />
            </FormField>
          </div>
          {selectedMethod?.requiresReference && (
            <FormField label="Reference" error={errors.reference} required>
              <Input value={form.reference} onChange={set('reference')}
                error={errors.reference} placeholder="Transaction reference" />
            </FormField>
          )}
          <FormField label="Date" required>
            <Input type="date" value={form.expenseDate} onChange={set('expenseDate')} />
          </FormField>
          <FormField label="Notes">
            <Textarea value={form.notes} onChange={set('notes')} rows={2} />
          </FormField>
        </form>
      </Modal>

      {/* ── Add category modal (Admin only) ─────────────────────────────── */}
      <Modal
        isOpen={showCatForm}
        onClose={() => { setShowCatForm(false); setCatForm({ name: '', description: '' }); setCatErrors({}); }}
        title="Add Expense Category"
        size="sm"
        onConfirm={handleSaveCategory}
        confirmLabel="Add Category"
        loading={catSaving}
      >
        <div className="space-y-4">
          {categories.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Existing Categories
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {categories.map(c => (
                  <Badge key={c.id} variant="slate">{c.name}</Badge>
                ))}
              </div>
            </div>
          )}
          <FormField label="Category Name" required error={catErrors.name}>
            <Input
              value={catForm.name}
              onChange={setCat('name')}
              error={catErrors.name}
              placeholder="e.g. Transport"
              autoFocus
            />
          </FormField>
          <FormField label="Description" hint="Optional">
            <Textarea value={catForm.description} onChange={setCat('description')} rows={2}
              placeholder="Brief description of this category" />
          </FormField>
        </div>
      </Modal>

      {/* ── Delete confirm ───────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={!!delId}
        onClose={() => setDelId(null)}
        onConfirm={handleDelete}
        title="Delete Expense?"
        message="This cannot be undone."
      />
    </div>
  );
}