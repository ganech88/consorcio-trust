import { useState, useEffect } from 'react';
import { Receipt, CheckCircle, Clock, AlertCircle, Loader2, X, CreditCard, ChevronDown, ChevronUp, Gavel, UploadCloud } from 'lucide-react';
import { fetchExpenses, fetchConsortiumFines, fetchUserPeriodItems, reportPeriodItemPayment, fetchConsortium, uploadPaymentProof } from '../services/data.service';
import { useToast } from './Toast';
import { useData } from '../context/DataContext';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400', icon: Clock },
  partial: { label: 'Parcial',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-brand-400',   icon: Clock },
  paid:    { label: 'Pagado',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', icon: CheckCircle },
  overdue: { label: 'Vencido',   color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',        icon: AlertCircle },
};

const PAYMENT_STATUS_CONFIG = {
  pending:  { label: 'Pendiente de aprobacion', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  reported: { label: 'En revision',             color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-brand-400' },
  approved: { label: 'Aprobado',                color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  rejected: { label: 'Rechazado',               color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
};

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount || 0);
}

function formatPeriod(period) {
  if (!period) return '';
  const [year, month] = period.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

function PeriodReportModal({ item, onClose, onReported }) {
  const toast = useToast();
  const [notes, setNotes] = useState('');
  const [method, setMethod] = useState('Transferencia');
  const [payFile, setPayFile] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      let receiptUrl = null;
      if (payFile) {
        const { path } = await uploadPaymentProof(payFile);
        receiptUrl = path;
      }
      await reportPeriodItemPayment(item.id, { notes: notes.trim() || null, method, receiptUrl });
      toast.success('Pago informado. El administrador lo revisara.');
      onReported(item.id);
      onClose();
    } catch (err) {
      toast.error(err.message, 'Error al informar el pago');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-surface-panel rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/[0.07]">
          <h4 className="font-bold text-slate-800 dark:text-ink-hi">Informar pago</h4>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-3">
            <p className="text-xs font-semibold text-brand-700 dark:text-brand-400">{formatPeriod(item.expense_periods?.period)}</p>
            <p className="text-sm font-bold text-brand-700 dark:text-brand-400 mt-0.5">Tu parte: {formatCurrency(item.amount)}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">Medio de pago</label>
            <select value={method} onChange={e => setMethod(e.target.value)} className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none">
              {['Transferencia','Deposito','Efectivo','MercadoPago','Otro'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">Comprobante (imagen o PDF)</label>
            <label className={`flex items-center gap-2 cursor-pointer border-2 border-dashed rounded-xl px-3 py-3 text-sm transition-colors ${payFile ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-400/[0.10] text-emerald-700 dark:text-emerald-400' : 'border-slate-200 dark:border-white/[0.09] text-slate-500 dark:text-ink-mid hover:border-slate-300'}`}>
              <UploadCloud size={16} />
              <span className="truncate">{payFile ? payFile.name : 'Adjuntar comprobante'}</span>
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => setPayFile(e.target.files?.[0] || null)} />
            </label>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">Notas / N de operacion (opcional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Ej: Transferencia banco / comprobante..." className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none resize-none" />
          </div>
          <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
            Informar pago
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ExpensesView({ session, userProfile }) {
  const toast = useToast();
  const { payments: informedPayments } = useData();
  const [consortiumExpenses, setConsortiumExpenses] = useState([]);
  const [periodItems, setPeriodItems] = useState([]);
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportTarget, setReportTarget] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [showTotals, setShowTotals] = useState(false);

  useEffect(() => {
    if (!userProfile?.consortium_id) return;
    Promise.all([
      fetchExpenses(userProfile.consortium_id),
      fetchConsortiumFines(userProfile.consortium_id),
      fetchUserPeriodItems(session?.user?.id),
      fetchConsortium(userProfile.consortium_id),
    ])
      .then(([exp, myFines, items, cons]) => {
        setConsortiumExpenses(exp || []);
        setFines(myFines || []);
        setPeriodItems(items || []);
        setPaymentInfo(cons || null);
      })
      .catch(e => toast.error(e.message, 'Error al cargar expensas'))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, session?.user?.id, toast]);

  const myUserId = session?.user?.id;
  const activeFines = fines.filter(f => f.status === 'active');
  const myActiveFines = activeFines.filter(f => f.user_id === myUserId);
  const totalFines = myActiveFines.reduce((s, f) => s + Number(f.amount), 0);
  const myPending = periodItems.filter(it => it.status !== 'paid').reduce((s, it) => s + Number(it.amount || 0), 0);
  const totalPending = myPending + totalFines;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={32} className="animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header: tu parte */}
      <div className="bg-brand-600 p-6 rounded-2xl text-white shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <Receipt size={24} />
          <h3 className="text-xl font-bold">Mis Expensas</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/15 rounded-xl p-3">
            <p className="text-white/70 text-xs font-medium mb-1">Lo que te toca pagar</p>
            <p className="text-2xl font-bold">{formatCurrency(totalPending)}</p>
          </div>
          <div className="bg-white/15 rounded-xl p-3">
            <p className="text-white/70 text-xs font-medium mb-1">Unidad</p>
            <p className="text-2xl font-bold">{userProfile?.unit_label ?? userProfile?.unit_id ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Recordatorio de vencimiento */}
      {(() => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const due = periodItems.filter(it => it.status !== 'paid' && it.expense_periods?.due_date
          && (new Date(it.expense_periods.due_date) - today) / 86400000 <= 7);
        if (due.length === 0) return null;
        const total = due.reduce((s, it) => s + Number(it.amount || 0), 0);
        const overdue = due.some(it => new Date(it.expense_periods.due_date) < today);
        return (
          <div className={`rounded-2xl p-4 flex items-center gap-3 ${overdue ? 'bg-red-50 dark:bg-red-400/[0.12] border border-red-200 dark:border-red-800' : 'bg-amber-50 dark:bg-amber-400/[0.12] border border-amber-200 dark:border-amber-800'}`}>
            <AlertCircle size={20} className={overdue ? 'text-red-500 dark:text-red-400 shrink-0' : 'text-amber-500 dark:text-amber-400 shrink-0'} />
            <div>
              <p className={`text-sm font-bold ${overdue ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                {overdue ? 'Tenes expensas vencidas' : 'Recordatorio de vencimiento'}
              </p>
              <p className="text-xs text-slate-600 dark:text-ink-mid">
                {due.length} expensa(s) por un total de {formatCurrency(total)}. Informa tu pago abajo.
              </p>
            </div>
          </div>
        );
      })()}

      {/* Como pagar (medios de pago) */}
      {paymentInfo && (paymentInfo.payment_cbu || paymentInfo.payment_alias || paymentInfo.payment_instructions) && (
        <div className="bg-white dark:bg-surface-panel rounded-2xl border border-emerald-200 dark:border-emerald-800 p-5">
          <h4 className="font-bold text-slate-800 dark:text-ink-hi text-sm flex items-center gap-2 mb-2">
            <CreditCard size={16} className="text-emerald-500" />
            Como pagar
          </h4>
          <p className="text-xs text-slate-500 dark:text-ink-mid mb-3">
            Transferi a estos datos y despues informa tu pago con el comprobante.
          </p>
          <div className="space-y-1.5 text-sm">
            {paymentInfo.payment_cbu && <div className="flex justify-between gap-3"><span className="text-slate-400 dark:text-ink-low">CBU/CVU</span><span className="font-mono text-slate-800 dark:text-ink-hi select-all">{paymentInfo.payment_cbu}</span></div>}
            {paymentInfo.payment_alias && <div className="flex justify-between gap-3"><span className="text-slate-400 dark:text-ink-low">Alias</span><span className="font-mono text-slate-800 dark:text-ink-hi select-all">{paymentInfo.payment_alias}</span></div>}
            {paymentInfo.payment_bank && <div className="flex justify-between gap-3"><span className="text-slate-400 dark:text-ink-low">Banco</span><span className="text-slate-800 dark:text-ink-hi">{paymentInfo.payment_bank}</span></div>}
            {paymentInfo.payment_holder && <div className="flex justify-between gap-3"><span className="text-slate-400 dark:text-ink-low">Titular</span><span className="text-slate-800 dark:text-ink-hi">{paymentInfo.payment_holder}</span></div>}
          </div>
          {paymentInfo.payment_instructions && (
            <p className="text-xs text-slate-500 dark:text-ink-mid mt-3 bg-slate-50 dark:bg-surface-inset rounded-lg p-2.5 whitespace-pre-wrap">{paymentInfo.payment_instructions}</p>
          )}
        </div>
      )}

      {/* Mi expensa por periodo (segun mi coeficiente) */}
      <div>
        <h4 className="text-xs font-bold text-slate-400 dark:text-ink-low uppercase tracking-wider mb-3 px-1">
          Mi expensa (segun mi coeficiente)
        </h4>
        {periodItems.length === 0 ? (
          <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-8 text-center">
            <Receipt size={36} className="mx-auto text-slate-300 dark:text-ink-low mb-3" />
            <p className="text-slate-500 dark:text-ink-mid text-sm">Todavia no hay expensas liquidadas para tu unidad</p>
            <p className="text-slate-400 dark:text-ink-low text-xs mt-1">Cuando la administracion liquide el periodo, vas a ver aca tu parte para informar el pago.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {periodItems.map(it => (
              <div key={it.id} className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-400/[0.14] flex items-center justify-center shrink-0">
                  <Receipt size={18} className="text-brand-600 dark:text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-ink-hi text-sm">{formatPeriod(it.expense_periods?.period)}</p>
                  <p className="text-xs text-slate-400 dark:text-ink-low">
                    {it.expense_periods?.due_date ? `Vence ${new Date(it.expense_periods.due_date).toLocaleDateString('es-AR')}` : ''}
                  </p>
                </div>
                <p className="font-bold text-slate-800 dark:text-ink-hi font-mono shrink-0">{formatCurrency(it.amount)}</p>
                {it.status === 'paid' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">Pagada</span>
                ) : it.status === 'reported' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-brand-400">En revision</span>
                ) : (
                  <button onClick={() => setReportTarget(it)} className="flex items-center gap-1 bg-brand-600 hover:bg-brand-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0">
                    <CreditCard size={11} /> Informar pago
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mis pagos informados (estado) */}
      {informedPayments.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-slate-400 dark:text-ink-low uppercase tracking-wider mb-3 px-1">
            Mis pagos informados ({informedPayments.length})
          </h4>
          <div className="space-y-2">
            {informedPayments.map(p => {
              const cfg = PAYMENT_STATUS_CONFIG[p.status] || PAYMENT_STATUS_CONFIG.pending;
              return (
                <div key={p.id} className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-4 flex items-center gap-3">
                  <CreditCard size={16} className="text-brand-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-ink-hi">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-slate-400 dark:text-ink-low">{new Date(p.created_at).toLocaleDateString('es-AR')}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${cfg.color}`}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gastos del consorcio (informativo, sin opcion de pago) */}
      {consortiumExpenses.length > 0 && (
        <div>
          <button
            onClick={() => setShowTotals(v => !v)}
            className="w-full flex items-center justify-between bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] px-4 py-3 text-sm font-semibold text-slate-600 dark:text-ink-mid hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors"
          >
            <span>Gastos del consorcio (informativo)</span>
            {showTotals ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showTotals && (
            <div className="space-y-2 mt-2">
              <p className="text-xs text-slate-400 dark:text-ink-low px-1">Estos son los gastos totales del edificio. Tu parte segun coeficiente es la de arriba.</p>
              {consortiumExpenses.map(exp => {
                const st = STATUS_CONFIG[exp.status] || STATUS_CONFIG.pending;
                return (
                  <div key={exp.id} className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-ink-hi text-sm truncate">{exp.title}</p>
                      <p className="text-xs text-slate-400 dark:text-ink-low">{formatPeriod(exp.period)}</p>
                    </div>
                    <p className="font-bold text-slate-800 dark:text-ink-hi font-mono shrink-0">{formatCurrency(exp.amount)}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${st.color}`}>{st.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Multas del edificio: las propias se pagan, las ajenas son informativas */}
      {activeFines.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-slate-400 dark:text-ink-low uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5">
            <Gavel size={13} /> Multas del periodo ({activeFines.length})
          </h4>
          <div className="space-y-2">
            {activeFines.map(fine => {
              const mine = fine.user_id === myUserId;
              return (
                <div key={fine.id} className={`rounded-2xl border p-4 flex items-start gap-3 ${mine ? 'bg-red-50 dark:bg-red-400/[0.12] border-red-200 dark:border-red-800' : 'bg-white dark:bg-surface-panel border-slate-100 dark:border-white/[0.07]'}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${mine ? 'bg-red-100 dark:bg-red-900/40' : 'bg-slate-100 dark:bg-surface-panel2'}`}>
                    <Gavel size={16} className={mine ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-ink-low'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${mine ? 'text-red-800 dark:text-red-200' : 'text-slate-700 dark:text-ink-hi'}`}>
                      {fine.unit_name ? `Unidad ${fine.unit_name}` : 'Unidad'} - {fine.reason}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-ink-low mt-0.5">
                      {new Date(fine.fine_date).toLocaleDateString('es-AR')}{fine.period ? ` - Periodo ${fine.period}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-bold ${mine ? 'text-red-700 dark:text-red-400' : 'text-slate-500 dark:text-ink-mid'}`}>{formatCurrency(fine.amount)}</p>
                    <span className={`text-[10px] font-bold uppercase ${mine ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-ink-low'}`}>{mine ? 'La pagas vos' : 'Otra unidad'}</span>
                  </div>
                </div>
              );
            })}
            {totalFines > 0 && (
              <div className="flex items-center justify-between bg-red-100 dark:bg-red-400/[0.14] rounded-xl px-4 py-2.5">
                <span className="text-xs font-bold text-red-700 dark:text-red-400">Tus multas (las pagas vos)</span>
                <span className="font-bold text-red-700 dark:text-red-400">{formatCurrency(totalFines)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {reportTarget && (
        <PeriodReportModal
          item={reportTarget}
          onClose={() => setReportTarget(null)}
          onReported={(itemId) => setPeriodItems(prev => prev.map(it => it.id === itemId ? { ...it, status: 'reported' } : it))}
        />
      )}
    </div>
  );
}
