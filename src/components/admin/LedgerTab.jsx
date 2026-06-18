import { useState, useEffect } from 'react';
import { Wallet, Receipt, Gavel } from 'lucide-react';
import { fetchUnits } from '../../services/units.service';
import { fetchUnitLedger } from '../../services/reports.service';
import { useToast } from '../Toast';
import { LoadingSpinner, EmptyState, fmtCurrency } from './shared';

const STATUS_BADGE = {
  paid:     { label: 'Pagado',    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  reported: { label: 'Informado', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-brand-400' },
  pending:  { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
};

export default function LedgerTab({ userProfile }) {
  const toast = useToast();
  const [units, setUnits] = useState([]);
  const [selected, setSelected] = useState('');
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(false);

  useEffect(() => {
    fetchUnits(userProfile?.consortium_id)
      .then(setUnits)
      .catch(e => toast.error(e.message, 'Error al cargar unidades'))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, toast]);

  async function handleSelect(unitId) {
    setSelected(unitId);
    setLedger(null);
    if (!unitId) return;
    const unit = units.find(u => u.id === unitId);
    setLoadingLedger(true);
    try {
      setLedger(await fetchUnitLedger(unit));
    } catch (e) {
      toast.error(e.message, 'Error al cargar la cuenta');
    } finally {
      setLoadingLedger(false);
    }
  }

  const movements = ledger ? [
    ...ledger.items.map(it => ({
      id: 'i' + it.id, kind: 'expensa', label: `Expensa ${it.expense_periods?.period ?? ''}`.trim(),
      date: it.expense_periods?.due_date || it.created_at, amount: Number(it.amount || 0), status: it.status,
    })),
    ...ledger.fines.map(f => ({
      id: 'f' + f.id, kind: 'multa', label: f.reason || 'Multa',
      date: f.fine_date, amount: Number(f.amount || 0), status: f.status === 'paid' ? 'paid' : 'pending',
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)) : [];

  const totalFacturado = movements.reduce((s, m) => s + m.amount, 0);
  const totalPagado = movements.filter(m => m.status === 'paid').reduce((s, m) => s + m.amount, 0);
  const saldo = totalFacturado - totalPagado;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-5">
        <h4 className="font-bold text-slate-800 dark:text-ink-hi text-sm flex items-center gap-2 mb-3">
          <Wallet size={16} className="text-brand-500" />
          Cuenta corriente por unidad
        </h4>
        <select
          value={selected}
          onChange={e => handleSelect(e.target.value)}
          className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none"
        >
          <option value="">Elegí una unidad…</option>
          {units.map(u => <option key={u.id} value={u.id}>Unidad {u.name}</option>)}
        </select>
      </div>

      {loadingLedger ? (
        <LoadingSpinner />
      ) : !ledger ? (
        <EmptyState icon={Wallet} text="Elegí una unidad para ver su estado de cuenta" />
      ) : (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-4">
              <p className="text-xs text-slate-400 dark:text-ink-low mb-1">Facturado</p>
              <p className="font-bold text-slate-800 dark:text-ink-hi font-mono text-sm">{fmtCurrency(totalFacturado)}</p>
            </div>
            <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-4">
              <p className="text-xs text-slate-400 dark:text-ink-low mb-1">Pagado</p>
              <p className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">{fmtCurrency(totalPagado)}</p>
            </div>
            <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-4">
              <p className="text-xs text-slate-400 dark:text-ink-low mb-1">Saldo</p>
              <p className={`font-bold font-mono text-sm ${saldo > 0 ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{fmtCurrency(saldo)}</p>
            </div>
          </div>

          {/* Movimientos */}
          {movements.length === 0 ? (
            <EmptyState icon={Receipt} text="Esta unidad no tiene cargos registrados" />
          ) : (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 dark:text-ink-low uppercase tracking-wider px-1">
                Movimientos ({movements.length})
              </h4>
              {movements.map(m => {
                const badge = STATUS_BADGE[m.status] ?? STATUS_BADGE.pending;
                return (
                  <div key={m.id} className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-4 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${m.kind === 'multa' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-brand-100 dark:bg-brand-400/[0.14]'}`}>
                      {m.kind === 'multa' ? <Gavel size={16} className="text-red-500 dark:text-red-400" /> : <Receipt size={16} className="text-brand-600 dark:text-brand-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-ink-hi text-sm truncate">{m.label}</p>
                      <p className="text-xs text-slate-400 dark:text-ink-low">{m.date ? new Date(m.date).toLocaleDateString('es-AR') : '—'}</p>
                    </div>
                    <p className="font-bold text-slate-800 dark:text-ink-hi font-mono shrink-0">{fmtCurrency(m.amount)}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${badge.cls}`}>{badge.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
