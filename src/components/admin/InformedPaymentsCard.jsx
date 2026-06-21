import { useState, useEffect } from 'react';
import { Banknote, Check, X, Loader2, FileText } from 'lucide-react';
import { fetchInformedPayments, setInformedPaymentStatus, getSignedComprobanteUrl, fetchReportedPeriodItems, approvePeriodItem, rejectPeriodItem } from '../../services/data.service';
import { useToast } from '../Toast';
import { fmtCurrency } from './shared';

function periodLabel(period) {
  if (!period) return '';
  const [y, m] = period.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

export default function InformedPaymentsCard({ userProfile }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  const cid = userProfile?.consortium_id;

  useEffect(() => {
    if (!cid) { setLoading(false); return; }
    Promise.all([fetchInformedPayments(cid), fetchReportedPeriodItems(cid)])
      .then(([pays, periodItems]) => {
        const a = (pays || []).map(p => ({
          key: 'pay-' + p.id, id: p.id, kind: 'payment', amount: p.amount,
          who: p.payer_name, sub: p.unit_name ? `Unidad ${p.unit_name}` : 'Sin unidad',
          date: p.created_at, proof: p.proof_url,
        }));
        const b = (periodItems || []).map(it => ({
          key: 'per-' + it.id, id: it.id, kind: 'period', amount: it.amount,
          who: it.payer_name, sub: periodLabel(it.period) || 'Expensa por coeficiente',
          date: it.reported_at, proof: it.receipt_url,
        }));
        setItems([...a, ...b].sort((x, y) => new Date(y.date || 0) - new Date(x.date || 0)));
      })
      .catch(e => toast.error(e.message, 'Error al cargar pagos informados'))
      .finally(() => setLoading(false));
  }, [cid, toast]);

  async function act(row, approve) {
    setActing(row.key);
    try {
      if (row.kind === 'payment') {
        await setInformedPaymentStatus(row.id, approve ? 'approved' : 'rejected');
      } else if (approve) {
        await approvePeriodItem(row.id, userProfile?.id);
      } else {
        await rejectPeriodItem(row.id);
      }
      setItems(prev => prev.filter(r => r.key !== row.key));
      toast.success(approve ? 'Pago aprobado' : 'Pago rechazado');
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
      <p className="text-xs text-slate-500 dark:text-ink-mid mb-3">Residentes que informaron un pago y esperan tu confirmacion.</p>
      <div className="space-y-2">
        {items.map(row => (
          <div key={row.key} className="flex flex-wrap items-center gap-3 border border-slate-100 dark:border-white/[0.07] rounded-xl p-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 dark:text-ink-hi text-sm font-mono">{fmtCurrency(row.amount)}</p>
              <p className="text-xs text-slate-400 dark:text-ink-low truncate">
                {row.who} · {row.sub} · {row.date ? new Date(row.date).toLocaleDateString('es-AR') : ''}
              </p>
            </div>
            {row.proof && (
              <button onClick={() => openProof(row.proof)} className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline shrink-0">
                <FileText size={13} /> Comprobante
              </button>
            )}
            <button onClick={() => act(row, false)} disabled={acting === row.key} className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 dark:bg-red-400/[0.14] text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg text-xs font-semibold disabled:opacity-60 shrink-0 transition-colors">
              {acting === row.key ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} Rechazar
            </button>
            <button onClick={() => act(row, true)} disabled={acting === row.key} className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-60 shrink-0 transition-colors">
              {acting === row.key ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Aprobar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
