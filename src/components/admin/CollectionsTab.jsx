import { useState, useEffect } from 'react';
import { HelpCircle, Plus, Loader2, Link2, Trash2, CheckCircle2 } from 'lucide-react';
import {
  fetchUnidentifiedPayments, createUnidentifiedPayment,
  assignUnidentifiedPayment, deleteUnidentifiedPayment, fetchUnitsLite,
} from '../../services/collections.service';
import { useToast } from '../Toast';
import { LoadingSpinner, EmptyState, fmtCurrency } from './shared';

const METHODS = ['Transferencia', 'Depósito', 'Efectivo', 'MercadoPago', 'Cheque', 'Otro'];

export default function CollectionsTab({ session, userProfile }) {
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(null);
  const [assignSel, setAssignSel] = useState({});
  const [form, setForm] = useState({ amount: '', paid_at: new Date().toISOString().slice(0, 10), method: METHODS[0], reference: '', notes: '' });

  function setField(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  useEffect(() => {
    const cid = userProfile?.consortium_id;
    Promise.all([fetchUnidentifiedPayments(cid), fetchUnitsLite(cid)])
      .then(([p, u]) => { setPayments(p); setUnits(u); })
      .catch(e => toast.error(e.message, 'Error al cargar cobranzas'))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, toast]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Ingresá un monto válido'); return; }
    setSaving(true);
    try {
      const payment = await createUnidentifiedPayment(userProfile?.consortium_id, session.user.id, {
        amount: Number(form.amount),
        paid_at: form.paid_at,
        method: form.method,
        reference: form.reference.trim() || null,
        notes: form.notes.trim() || null,
      });
      setPayments(prev => [payment, ...prev]);
      setForm({ amount: '', paid_at: new Date().toISOString().slice(0, 10), method: METHODS[0], reference: '', notes: '' });
      toast.success('Cobranza registrada');
    } catch (e) {
      toast.error(e.message, 'Error al registrar cobranza');
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign(id) {
    const unitId = assignSel[id];
    if (!unitId) { toast.error('Elegí una unidad'); return; }
    const unit = units.find(u => u.id === unitId);
    setBusy(id);
    try {
      const updated = await assignUnidentifiedPayment(id, unitId, unit?.owner_id || unit?.tenant_id || null);
      setPayments(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
      toast.success(`Cobranza asociada a ${unit?.name ?? 'la unidad'}`);
    } catch (e) {
      toast.error(e.message, 'Error al asociar');
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(id) {
    setBusy(id);
    try {
      await deleteUnidentifiedPayment(id);
      setPayments(prev => prev.filter(p => p.id !== id));
      toast.success('Cobranza eliminada');
    } catch (e) {
      toast.error(e.message, 'Error al eliminar');
    } finally {
      setBusy(null);
    }
  }

  const inputCls = 'w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none';
  const labelCls = 'text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block';
  const pending = payments.filter(p => p.status === 'pending');

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-5 space-y-4">
        <h4 className="font-bold text-slate-800 dark:text-ink-hi text-sm flex items-center gap-2">
          <HelpCircle size={16} className="text-amber-500" />
          Registrar cobranza no identificada
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Monto ($)</label>
            <input type="number" min="0" value={form.amount} onChange={e => setField('amount', e.target.value)} placeholder="0" className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Fecha de pago</label>
            <input type="date" value={form.paid_at} onChange={e => setField('paid_at', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Medio</label>
            <select value={form.method} onChange={e => setField('method', e.target.value)} className={inputCls}>
              {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Referencia / N° operación</label>
            <input type="text" value={form.reference} onChange={e => setField('reference', e.target.value)} placeholder="Opcional" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Notas</label>
            <input type="text" value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Observaciones..." className={inputCls} />
          </div>
        </div>
        <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Registrar cobranza
        </button>
      </form>

      {loading ? (
        <LoadingSpinner />
      ) : payments.length === 0 ? (
        <EmptyState icon={HelpCircle} text="No hay cobranzas no identificadas" />
      ) : (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 dark:text-ink-low uppercase tracking-wider px-1">
            Cobranzas ({pending.length} pendientes de asociar)
          </h4>
          {payments.map(p => (
            <div key={p.id} className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-400/[0.14] rounded-xl flex items-center justify-center shrink-0">
                  <HelpCircle size={18} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-800 dark:text-ink-hi font-mono">{fmtCurrency(p.amount)}</p>
                    {p.status === 'assigned' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                        <CheckCircle2 size={11} /> {p.units?.name ? `Asociada a ${p.units.name}` : 'Asociada'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">Sin identificar</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 dark:text-ink-low mt-0.5">
                    {new Date(p.paid_at + 'T00:00:00').toLocaleDateString('es-AR')}
                    {p.method ? ` · ${p.method}` : ''}{p.reference ? ` · ${p.reference}` : ''}
                  </p>
                </div>
                {p.status === 'pending' && (
                  <button onClick={() => handleDelete(p.id)} disabled={busy === p.id} className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0" title="Eliminar">
                    {busy === p.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                )}
              </div>
              {p.status === 'pending' && (
                <div className="flex items-center gap-2 mt-3 pl-14">
                  <select
                    value={assignSel[p.id] || ''}
                    onChange={e => setAssignSel(prev => ({ ...prev, [p.id]: e.target.value }))}
                    className="flex-1 border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="">Asociar a unidad…</option>
                    {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <button onClick={() => handleAssign(p.id)} disabled={busy === p.id} className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-[#04201d] px-3 py-2 rounded-xl text-xs font-bold transition-colors shrink-0">
                    {busy === p.id ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                    Asociar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
