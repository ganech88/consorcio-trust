import { useState, useEffect } from 'react';
import { Banknote, Check, X, Loader2, FileText } from 'lucide-react';
import { fetchInformedPayments, setInformedPaymentStatus, getSignedComprobanteUrl } from '../../services/data.service';
import { useToast } from '../Toast';
import { fmtCurrency } from './shared';

export default function InformedPaymentsCard({ userProfile }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  const cid = userProfile?.consortium_id;

  useEffect(() => {
    if (!cid) { setLoading(false); return; }
    fetchInformedPayments(cid)
      .then(setItems)
      .catch(e => toast.error(e.message, 'Error al cargar pagos informados'))
      .finally(() => setLoading(false));
  }, [cid, toast]);

  async function act(id, status) {
    setActing(id);
    try {
      await setInformedPaymentStatus(id, status);
      setItems(prev => prev.filter(p => p.id !== id));
      toast.success(status === 'approved' ? 'Pago aprobado' : 'Pago rechazado');
    } catch (e) {
      toast.error(e.message, 'No se pudo actualizar el pago');
    } finally {
      setActing(null);
    }
  }

  async function openProof(path) {
    try {
      const url = await getSignedComprobanteUrl(path);
      if (url) window.open(url, '_blank', 'noopener');
      else toast.error('No se pudo abrir el comprobante');
    } catch (e) {
      toast.error(e.message, 'No se pudo abrir el comprobante');
    }
  }

  if (loading || items.length === 0) return null;

  return (
    <div className="bg-white dark:bg-surface-panel rounded-2xl border border-amber-200 dark:border-amber-800 p-5">
      <h4 className="font-bold text-slate-800 dark:text-ink-hi text-sm flex items-center gap-2 mb-1">
        <Banknote size={16} className="text-amber-500" />
        Pagos informados por aprobar
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-400/[0.14] dark:text-amber-400">{items.length}</span>
      </h4>
      <p className="text-xs text-slate-500 dark:text-ink-mid mb-3">Residentes que informaron un pago y esperan tu confirmación.</p>
      <div className="space-y-2">
        {items.map(p => (
          <div key={p.id} className="flex flex-wrap items-center gap-3 border border-slate-100 dark:border-white/[0.07] rounded-xl p-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 dark:text-ink-hi text-sm font-mono">{fmtCurrency(p.amount)}</p>
              <p className="text-xs text-slate-400 dark:text-ink-low truncate">
                {p.payer_name} · {p.unit_name ? `Unidad ${p.unit_name}` : 'Sin unidad'} · {new Date(p.created_at).toLocaleDateString('es-AR')}
              </p>
            </div>
            {p.proof_url && (
              <button onClick={() => openProof(p.proof_url)} className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline shrink-0">
                <FileText size={13} /> Comprobante
              </button>
            )}
            <button onClick={() => act(p.id, 'rejected')} disabled={acting === p.id} className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 dark:bg-red-400/[0.14] text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg text-xs font-semibold disabled:opacity-60 shrink-0 transition-colors">
              {acting === p.id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} Rechazar
            </button>
            <button onClick={() => act(p.id, 'approved')} disabled={acting === p.id} className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-60 shrink-0 transition-colors">
              {acting === p.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Aprobar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
