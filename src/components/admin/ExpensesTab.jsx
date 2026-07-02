import { useState, useEffect, useCallback } from 'react';
import {
  Receipt, Plus, Eye, Check, X, Trash2, CreditCard, Loader2,
} from 'lucide-react';
import {
  fetchExpenses, createExpense, updateExpense, deleteExpense, updatePaymentStatus,
  fetchExpenseReport,
} from '../../services/data.service';
import { exportToExcel, exportToPdf } from '../../lib/export-utils';
import { useToast } from '../Toast';
import { EXPENSE_STATUS_LABELS, PAYMENT_STATUS_LABELS, fmtCurrency, LoadingSpinner, EmptyState } from './shared';
import Pagination from './Pagination';
import InformedPaymentsCard from './InformedPaymentsCard';

// ─── Export button ───────────────────────────────────────────────────────────

const EXPORT_COLUMNS = [
  { header: 'Unidad',       key: 'unidad' },
  { header: 'Propietario',  key: 'propietario' },
  { header: 'Email',        key: 'email' },
  { header: 'Teléfono',     key: 'telefono' },
  { header: 'Monto ($)',    key: 'monto' },
  { header: '% del total',  key: 'porcentaje' },
  { header: 'Estado',       key: 'estado' },
  { header: 'Fecha pago',   key: 'fecha_pago' },
  { header: 'Notas',        key: 'notas' },
];

function ExpenseExportButton({ expenseId, expenseTitle }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function handleExport(format) {
    setLoading(true);
    try {
      const rows = await fetchExpenseReport(expenseId);
      if (!rows.length) { toast.info('No hay pagos para exportar'); return; }
      const fileName = `expensa-${expenseTitle.replace(/\s+/g, '-').toLowerCase()}`;
      if (format === 'excel') {
        await exportToExcel(rows, EXPORT_COLUMNS, fileName, 'Pagos');
      } else {
        await exportToPdf(rows, EXPORT_COLUMNS, `Reporte: ${expenseTitle}`, fileName);
      }
    } catch (err) {
      toast.error(err.message, 'Error al exportar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleExport('excel')}
        disabled={loading}
        title="Exportar Excel"
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-400/[0.12] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-[11px] font-semibold transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 size={11} className="animate-spin" /> : null}
        XLS
      </button>
      <button
        onClick={() => handleExport('pdf')}
        disabled={loading}
        title="Exportar PDF"
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 dark:bg-red-400/[0.12] text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 text-[11px] font-semibold transition-colors disabled:opacity-50"
      >
        PDF
      </button>
    </div>
  );
}

// ─── Main tab ────────────────────────────────────────────────────────────────

const EMPTY_FORM = { title: '', description: '', amount: '', period: '', due_date: '' };

export default function ExpensesTab({ session, userProfile }) {
  const toast = useToast();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [, setPage] = useState(0);
  const [pagination, setPagination] = useState(null);

  const loadPage = useCallback((p) => {
    if (!userProfile?.consortium_id) { setLoading(false); return; }
    setLoading(true);
    fetchExpenses(userProfile.consortium_id, { page: p })
      .then(result => {
        setExpenses(result.data);
        setPagination(result);
        setPage(p);
      })
      .catch(e => toast.error(e.message, 'Error al cargar expensas'))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, toast]);

  useEffect(() => { loadPage(0); }, [loadPage]);

  function openNew() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(exp) {
    setEditTarget(exp);
    setForm({
      title: exp.title,
      description: exp.description || '',
      amount: String(exp.amount),
      period: exp.period,
      due_date: exp.due_date || '',
    });
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.amount || !form.period) {
      toast.error('Completá título, monto y período');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        amount: Number(form.amount),
        period: form.period,
        due_date: form.due_date || null,
      };
      if (editTarget) {
        const updated = await updateExpense(editTarget.id, payload);
        setExpenses(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e));
        toast.success('Expensa actualizada');
      } else {
        const created = await createExpense(userProfile.consortium_id, session.user.id, payload);
        setExpenses(prev => [{ ...created, expense_payments: [] }, ...prev]);
        toast.success('Expensa creada');
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.message, 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(expId) {
    if (!window.confirm('¿Eliminar esta expensa?')) return;
    try {
      await deleteExpense(expId);
      setExpenses(prev => prev.filter(e => e.id !== expId));
      toast.success('Expensa eliminada');
    } catch (err) {
      toast.error(err.message, 'Error al eliminar');
    }
  }

  async function handleStatusChange(expId, status) {
    try {
      const updated = await updateExpense(expId, { status });
      setExpenses(prev => prev.map(e => e.id === updated.id ? { ...e, status: updated.status } : e));
      toast.success('Estado actualizado');
    } catch (err) {
      toast.error(err.message, 'Error al actualizar');
    }
  }

  async function handleApprovePayment(paymentId, status) {
    setApprovingId(paymentId);
    try {
      const updated = await updatePaymentStatus(paymentId, status, null);
      setExpenses(prev => prev.map(exp => ({
        ...exp,
        expense_payments: (exp.expense_payments || []).map(p =>
          p.id === paymentId ? { ...p, status: updated.status } : p
        ),
      })));
      toast.success(status === 'approved' ? 'Pago aprobado' : 'Pago rechazado');
    } catch (err) {
      toast.error(err.message, 'Error al actualizar pago');
    } finally {
      setApprovingId(null);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <InformedPaymentsCard userProfile={userProfile} />
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-ink-mid">
          {expenses.length} expensa{expenses.length !== 1 ? 's' : ''} registrada{expenses.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
        >
          <Plus size={14} /> Nueva expensa
        </button>
      </div>

      {expenses.length === 0 ? (
        <EmptyState icon={Receipt} text="No hay expensas registradas aún" />
      ) : (
        <div className="space-y-3">
          {expenses.map(exp => {
            const st = EXPENSE_STATUS_LABELS[exp.status] || EXPENSE_STATUS_LABELS.pending;
            const payments = exp.expense_payments || [];
            const isExpanded = expandedId === exp.id;
            return (
              <div key={exp.id} className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] overflow-hidden">
                <div className="p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 dark:text-ink-hi text-sm">{exp.title}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-ink-mid mt-0.5">
                      {exp.period}{exp.due_date ? ` · Vence ${new Date(exp.due_date).toLocaleDateString('es-AR')}` : ''}
                    </p>
                    {exp.description && (
                      <p className="text-xs text-slate-400 dark:text-ink-low mt-0.5 truncate">{exp.description}</p>
                    )}
                  </div>
                  <p className="font-bold text-slate-800 dark:text-ink-hi shrink-0">{fmtCurrency(exp.amount)}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : exp.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                      title="Ver pagos"
                    >
                      <Eye size={14} />
                    </button>
                    <select
                      value={exp.status}
                      onChange={e => handleStatusChange(exp.id, e.target.value)}
                      className="text-xs border border-slate-200 dark:border-white/[0.09] rounded-lg px-1.5 py-1 bg-white dark:bg-surface-panel2 dark:text-ink-hi outline-none"
                    >
                      {Object.entries(EXPENSE_STATUS_LABELS).map(([val, { label }]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => openEdit(exp)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                      title="Editar"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-white/[0.07] px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-slate-500 dark:text-ink-mid uppercase tracking-wider">
                        Pagos recibidos ({payments.length})
                      </p>
                      <ExpenseExportButton expenseId={exp.id} expenseTitle={exp.title} />
                    </div>
                    {payments.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-ink-low">Sin pagos registrados</p>
                    ) : (
                      <div className="space-y-2">
                        {payments.map(p => {
                          const pst = PAYMENT_STATUS_LABELS[p.status] || PAYMENT_STATUS_LABELS.pending;
                          return (
                            <div key={p.id} className="flex items-center gap-3 text-xs">
                              <CreditCard size={12} className="text-slate-400 shrink-0" />
                              <span className="flex-1 text-slate-700 dark:text-ink-mid">{fmtCurrency(p.amount)}</span>
                              <span className="text-slate-400 dark:text-ink-low">{new Date(p.paid_at).toLocaleDateString('es-AR')}</span>
                              <span className={`px-1.5 py-0.5 rounded-full font-bold text-[10px] ${pst.color}`}>{pst.label}</span>
                              {p.status === 'pending' && (
                                <div className="flex gap-1">
                                  <button
                                    disabled={approvingId === p.id}
                                    onClick={() => handleApprovePayment(p.id, 'approved')}
                                    className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-400/[0.14] dark:text-emerald-400 font-semibold disabled:opacity-60 transition-colors"
                                  >
                                    {approvingId === p.id ? <Loader2 size={10} className="animate-spin" /> : 'Aprobar'}
                                  </button>
                                  <button
                                    disabled={approvingId === p.id}
                                    onClick={() => handleApprovePayment(p.id, 'rejected')}
                                    className="px-2 py-0.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-400/[0.14] dark:text-red-400 font-semibold disabled:opacity-60 transition-colors"
                                  >
                                    Rechazar
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-panel rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/[0.07]">
              <h4 className="font-bold text-slate-800 dark:text-ink-hi">
                {editTarget ? 'Editar expensa' : 'Nueva expensa'}
              </h4>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">Título *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ej: Expensas Marzo 2026"
                  className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Detalle opcional..."
                  rows={2}
                  className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">Monto ($) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="Ej: 15000"
                    className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">Período * (AAAA-MM)</label>
                  <input
                    value={form.period}
                    onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                    placeholder="Ej: 2026-03"
                    pattern="\d{4}-\d{2}"
                    className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">Fecha vencimiento</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Receipt size={16} />}
                {editTarget ? 'Guardar cambios' : 'Crear expensa'}
              </button>
            </form>
          </div>
        </div>
      )}

      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.pageSize}
          onPageChange={loadPage}
        />
      )}
    </div>
  );
}
