import { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Loader2, Trash2 } from 'lucide-react';
import {
  fetchInsurancePolicies, createInsurancePolicy, deleteInsurancePolicy,
} from '../../services/insurance.service';
import { useToast } from '../Toast';
import { LoadingSpinner, EmptyState, fmtCurrency } from './shared';

const POLICY_TYPES = ['Integral de consorcio', 'Incendio', 'Responsabilidad civil', 'Ascensores', 'Robo', 'Otro'];

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr + 'T00:00:00') - new Date()) / 86400000);
}

function expiryBadge(days) {
  if (days === null) return { cls: 'bg-slate-100 text-slate-600 dark:bg-surface-panel2 dark:text-ink-mid', txt: 'Sin vencimiento' };
  if (days < 0)   return { cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400', txt: `Vencida hace ${Math.abs(days)}d` };
  if (days <= 30) return { cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400', txt: `Vence en ${days}d` };
  if (days <= 60) return { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400', txt: `Vence en ${days}d` };
  return { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', txt: `Vigente (${days}d)` };
}

export default function InsuranceTab({ session, userProfile }) {
  const toast = useToast();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState({
    insurer: '', policy_number: '', type: POLICY_TYPES[0],
    coverage_amount: '', premium: '', start_date: '', end_date: '', broker: '', notes: '',
  });

  function setField(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  useEffect(() => {
    fetchInsurancePolicies(userProfile?.consortium_id)
      .then(setPolicies)
      .catch(e => toast.error(e.message, 'Error al cargar pólizas'))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, toast]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.insurer.trim()) { toast.error('Ingresá la aseguradora'); return; }
    setSaving(true);
    try {
      const policy = await createInsurancePolicy(userProfile?.consortium_id, session.user.id, {
        insurer: form.insurer.trim(),
        policy_number: form.policy_number.trim() || null,
        type: form.type,
        coverage_amount: form.coverage_amount ? Number(form.coverage_amount) : null,
        premium: form.premium ? Number(form.premium) : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        broker: form.broker.trim() || null,
        notes: form.notes.trim() || null,
      });
      setPolicies(prev => [policy, ...prev]);
      setForm({ insurer: '', policy_number: '', type: POLICY_TYPES[0], coverage_amount: '', premium: '', start_date: '', end_date: '', broker: '', notes: '' });
      toast.success('Póliza registrada');
    } catch (e) {
      toast.error(e.message, 'Error al registrar póliza');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await deleteInsurancePolicy(id);
      setPolicies(prev => prev.filter(p => p.id !== id));
      toast.success('Póliza eliminada');
    } catch (e) {
      toast.error(e.message, 'Error al eliminar');
    } finally {
      setDeleting(null);
    }
  }

  const inputCls = 'w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none';
  const labelCls = 'text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block';

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-5 space-y-4">
        <h4 className="font-bold text-slate-800 dark:text-ink-hi text-sm flex items-center gap-2">
          <ShieldCheck size={16} className="text-brand-500" />
          Registrar póliza de seguro
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Aseguradora</label>
            <input type="text" value={form.insurer} onChange={e => setField('insurer', e.target.value)} placeholder="Ej: La Caja Seguros" className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>N° de póliza</label>
            <input type="text" value={form.policy_number} onChange={e => setField('policy_number', e.target.value)} placeholder="Opcional" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tipo</label>
            <select value={form.type} onChange={e => setField('type', e.target.value)} className={inputCls}>
              {POLICY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Productor / Broker</label>
            <input type="text" value={form.broker} onChange={e => setField('broker', e.target.value)} placeholder="Opcional" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Suma asegurada ($)</label>
            <input type="number" min="0" value={form.coverage_amount} onChange={e => setField('coverage_amount', e.target.value)} placeholder="Opcional" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Prima mensual ($)</label>
            <input type="number" min="0" value={form.premium} onChange={e => setField('premium', e.target.value)} placeholder="Opcional" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Vigencia desde</label>
            <input type="date" value={form.start_date} onChange={e => setField('start_date', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Vence</label>
            <input type="date" value={form.end_date} onChange={e => setField('end_date', e.target.value)} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Notas</label>
            <input type="text" value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Observaciones..." className={inputCls} />
          </div>
        </div>
        <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-[#04201d] py-2.5 rounded-xl text-sm font-bold transition-colors">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Registrar póliza
        </button>
      </form>

      {loading ? (
        <LoadingSpinner />
      ) : policies.length === 0 ? (
        <EmptyState icon={ShieldCheck} text="No hay pólizas registradas" />
      ) : (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 dark:text-ink-low uppercase tracking-wider px-1">
            Pólizas ({policies.length})
          </h4>
          {policies.map(p => {
            const badge = expiryBadge(daysUntil(p.end_date));
            return (
              <div key={p.id} className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-4 flex items-start gap-4">
                <div className="w-10 h-10 bg-brand-100 dark:bg-brand-400/[0.14] rounded-xl flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} className="text-brand-600 dark:text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800 dark:text-ink-hi">{p.insurer}</p>
                    <span className="text-[10px] bg-slate-100 dark:bg-surface-panel2 text-slate-500 dark:text-ink-mid px-1.5 py-0.5 rounded">{p.type}</span>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-ink-low mt-0.5 font-mono">
                    {p.policy_number ? `N° ${p.policy_number}` : 'Sin N°'}
                    {p.coverage_amount ? ` · Suma ${fmtCurrency(p.coverage_amount)}` : ''}
                    {p.premium ? ` · Prima ${fmtCurrency(p.premium)}` : ''}
                  </p>
                  <span className={`inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.txt}</span>
                </div>
                <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0" title="Eliminar">
                  {deleting === p.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
