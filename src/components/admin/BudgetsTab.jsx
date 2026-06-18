import { useState, useEffect } from 'react';
import { ClipboardList, Plus, Loader2, Check, X, Trash2 } from 'lucide-react';
import { fetchBudgets, createBudget, decideBudget, deleteBudget } from '../../services/budgets.service';
import { fetchSuppliers } from '../../services/suppliers.service';
import { useToast } from '../Toast';
import { LoadingSpinner, EmptyState, fmtCurrency } from './shared';

const BUDGET_STATUS = {
  pending:  { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  approved: { label: 'Aprobado',  color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  rejected: { label: 'Rechazado', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
};

export default function BudgetsTab({ session, userProfile }) {
  const toast = useToast();
  const [budgets, setBudgets] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(null);
  const [form, setForm] = useState({ title: '', supplier_id: '', amount: '', description: '' });

  function setField(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  useEffect(() => {
    const cid = userProfile?.consortium_id;
    Promise.all([fetchBudgets(cid), fetchSuppliers(cid)])
      .then(([b, s]) => { setBudgets(b); setSuppliers(s); })
      .catch(e => toast.error(e.message, 'Error al cargar presupuestos'))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, toast]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Ingresá un título'); return; }
    setSaving(true);
    try {
      const budget = await createBudget(userProfile?.consortium_id, session.user.id, {
        title: form.title.trim(),
        supplier_id: form.supplier_id || null,
        amount: form.amount ? Number(form.amount) : 0,
        description: form.description.trim() || null,
      });
      setBudgets(prev => [budget, ...prev]);
      setForm({ title: '', supplier_id: '', amount: '', description: '' });
      toast.success('Presupuesto cargado');
    } catch (e) {
      toast.error(e.message, 'Error al cargar presupuesto');
    } finally {
      setSaving(false);
    }
  }

  async function handleDecide(id, status) {
    setBusy(id);
    try {
      const updated = await decideBudget(id, status, session.user.id);
      setBudgets(prev => prev.map(b => b.id === id ? { ...b, ...updated } : b));
      toast.success(status === 'approved' ? 'Presupuesto aprobado' : 'Presupuesto rechazado');
    } catch (e) {
      toast.error(e.message, 'Error al actualizar');
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(id) {
    setBusy(id);
    try {
      await deleteBudget(id);
      setBudgets(prev => prev.filter(b => b.id !== id));
      toast.success('Presupuesto eliminado');
    } catch (e) {
      toast.error(e.message, 'Error al eliminar');
    } finally {
      setBusy(null);
    }
  }

  const inputCls = 'w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none';
  const labelCls = 'text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block';

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-5 space-y-4">
        <h4 className="font-bold text-slate-800 dark:text-ink-hi text-sm flex items-center gap-2">
          <ClipboardList size={16} className="text-brand-500" />
          Cargar presupuesto para aprobación
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Título / Concepto</label>
            <input type="text" value={form.title} onChange={e => setField('title', e.target.value)} placeholder="Ej: Impermeabilización de terraza" className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Proveedor</label>
            <select value={form.supplier_id} onChange={e => setField('supplier_id', e.target.value)} className={inputCls}>
              <option value="">— Sin proveedor —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Monto ($)</label>
            <input type="number" min="0" value={form.amount} onChange={e => setField('amount', e.target.value)} placeholder="0" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Detalle</label>
            <input type="text" value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Opcional" className={inputCls} />
          </div>
        </div>
        <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-[#04201d] py-2.5 rounded-xl text-sm font-bold transition-colors">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Cargar presupuesto
        </button>
      </form>

      {loading ? (
        <LoadingSpinner />
      ) : budgets.length === 0 ? (
        <EmptyState icon={ClipboardList} text="No hay presupuestos cargados" />
      ) : (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 dark:text-ink-low uppercase tracking-wider px-1">
            Presupuestos ({budgets.length})
          </h4>
          {budgets.map(b => {
            const st = BUDGET_STATUS[b.status] ?? BUDGET_STATUS.pending;
            return (
              <div key={b.id} className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 dark:text-ink-hi">{b.title}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-ink-low mt-0.5">
                      {b.suppliers?.name ? `${b.suppliers.name} · ` : ''}
                      <span className="font-mono text-slate-500 dark:text-ink-mid">{fmtCurrency(b.amount || 0)}</span>
                    </p>
                    {b.description && <p className="text-xs text-slate-500 dark:text-ink-mid mt-1">{b.description}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {b.status === 'pending' ? (
                      <>
                        <button onClick={() => handleDecide(b.id, 'approved')} disabled={busy === b.id} className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors" title="Aprobar">
                          {busy === b.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        </button>
                        <button onClick={() => handleDecide(b.id, 'rejected')} disabled={busy === b.id} className="flex items-center gap-1 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors" title="Rechazar">
                          <X size={12} />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => handleDelete(b.id)} disabled={busy === b.id} className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Eliminar">
                        {busy === b.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
