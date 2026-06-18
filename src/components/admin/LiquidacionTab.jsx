import { useState, useEffect } from 'react';
import { Receipt, ChevronUp, ChevronDown, Loader2, Users, Check, X, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  fetchExpensePeriods, createExpensePeriod, fetchPeriodItems, createPeriodItems,
  approvePeriodItem, rejectPeriodItem, deletePeriodItems,
} from '../../services/data.service';
import { fetchUnits } from '../../services/units.service';
import { useToast } from '../Toast';
import { LoadingSpinner, EmptyState } from './shared';

export default function LiquidacionTab({ session, userProfile }) {
  const toast = useToast();
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [periodItems, setPeriodItems] = useState({});
  const [loadingItems, setLoadingItems] = useState(null);
  const [decidingItem, setDecidingItem] = useState(null);
  const [form, setForm] = useState({
    period: new Date().toISOString().slice(0, 7),
    totalAmount: '',
    dueDate: '',
    amountPerUnit: '',
  });

  useEffect(() => {
    fetchExpensePeriods(userProfile?.consortium_id)
      .then(setPeriods)
      .catch(e => toast.error(e.message, 'Error al cargar períodos'))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, toast]);

  function setField(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  async function handleCreatePeriod(e) {
    e.preventDefault();
    if (!form.period || !form.totalAmount || !form.dueDate) {
      toast.error('Completá período, monto total y fecha de vencimiento');
      return;
    }
    setSaving(true);
    try {
      const p = await createExpensePeriod({
        period: form.period,
        totalAmount: Number(form.totalAmount),
        dueDate: form.dueDate,
        consortiumId: userProfile?.consortium_id,
        createdBy: session.user.id,
      });
      setPeriods(prev => [p, ...prev]);
      toast.success('Período creado');
      setForm({ period: new Date().toISOString().slice(0, 7), totalAmount: '', dueDate: '', amountPerUnit: '' });

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('ConsorcioTrust', {
          body: `Nueva expensa publicada para el período ${form.period}`,
          icon: '/favicon.ico',
        });
      }
    } catch (e) {
      toast.error(e.message, 'Error al crear período');
    } finally {
      setSaving(false);
    }
  }

  async function handleDistribute(period, force = false) {
    setSaving(period.id);
    try {
      const existing = periodItems[period.id] ?? await fetchPeriodItems(period.id);
      if (existing.length > 0 && !force) {
        toast.error('Esta liquidación ya fue distribuida.');
        return;
      }
      if (existing.length > 0 && force) {
        if (existing.some(i => i.status === 'paid' || i.status === 'reported')) {
          toast.error('No se puede recalcular: ya hay pagos informados o aprobados.');
          return;
        }
        await deletePeriodItems(period.id);
      }
      const units = await fetchUnits(userProfile?.consortium_id);
      if (!units.length) { toast.error('No hay unidades cargadas. Cargalas en la pestana Unidades.'); return; }
      const withCoef = units.filter(u => u.coefficient != null && Number(u.coefficient) > 0);
      if (!withCoef.length) { toast.error('Ninguna unidad tiene coeficiente. Cargalos en la pestana Unidades.'); return; }

      const total = Number(period.total_amount);
      const rows = withCoef.map(u => ({
        period_id: period.id,
        unit_id: u.name,
        user_id: u.owner_id || null,
        amount: Math.round(total * Number(u.coefficient) / 100 * 100) / 100,
      }));

      await createPeriodItems(rows);
      const fresh = await fetchPeriodItems(period.id);
      setPeriodItems(prev => ({ ...prev, [period.id]: fresh }));

      const sumCoef = withCoef.reduce((s, u) => s + Number(u.coefficient), 0);
      toast.success(Math.abs(sumCoef - 100) < 0.5
        ? `Expensas distribuidas a ${rows.length} unidades segun su coeficiente`
        : `Distribuido a ${rows.length} unidades. Atencion: los coeficientes suman ${sumCoef.toFixed(2)}% (no 100%)`);
    } catch (e) {
      toast.error(e.message, 'Error al distribuir');
    } finally {
      setSaving(null);
    }
  }

  async function handleDecideItem(periodId, item, action) {
    setDecidingItem(item.id);
    try {
      const updated = action === 'approve'
        ? await approvePeriodItem(item.id, session.user.id)
        : await rejectPeriodItem(item.id);
      setPeriodItems(prev => ({
        ...prev,
        [periodId]: (prev[periodId] || []).map(it => it.id === item.id ? { ...it, ...updated } : it),
      }));
      toast.success(action === 'approve' ? 'Pago aprobado' : 'Pago rechazado');
    } catch (e) {
      toast.error(e.message, 'Error al actualizar el pago');
    } finally {
      setDecidingItem(null);
    }
  }

  async function handleExpand(period) {
    const isOpen = expanded === period.id;
    setExpanded(isOpen ? null : period.id);
    if (!isOpen && !periodItems[period.id]) {
      setLoadingItems(period.id);
      try {
        const items = await fetchPeriodItems(period.id);
        setPeriodItems(prev => ({ ...prev, [period.id]: items }));
      } catch (e) {
        toast.error(e.message, 'Error al cargar ítems');
      } finally {
        setLoadingItems(null);
      }
    }
  }

  function formatPeriod(p) {
    const [y, m] = p.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  }

  return (
    <div className="space-y-6">
      {/* Formulario de nueva liquidación */}
      <form onSubmit={handleCreatePeriod} className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-5 space-y-4">
        <h4 className="font-bold text-slate-800 dark:text-ink-hi text-sm">Nueva liquidación mensual</h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">Período</label>
            <input
              type="month"
              value={form.period}
              onChange={e => setField('period', e.target.value)}
              className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">Monto total ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.totalAmount}
              onChange={e => setField('totalAmount', e.target.value)}
              placeholder="Ej: 500000"
              className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">Fecha de vencimiento</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={e => setField('dueDate', e.target.value)}
              className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400 dark:text-ink-low">
            Al publicar, distribui el total entre las unidades segun su <strong className="text-slate-500 dark:text-ink-mid">coeficiente</strong> (pestana Unidades).
          </p>
          <button
            type="submit"
            disabled={saving === true}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shrink-0"
          >
            {saving === true ? <Loader2 size={14} className="animate-spin" /> : <Receipt size={14} />}
            Publicar
          </button>
        </div>
      </form>

      {/* Lista de períodos */}
      {loading ? (
        <LoadingSpinner />
      ) : periods.length === 0 ? (
        <EmptyState icon={Receipt} text="No hay liquidaciones publicadas aún" />
      ) : (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 dark:text-ink-low uppercase tracking-wider px-1">
            Períodos publicados ({periods.length})
          </h4>
          {periods.map(period => {
            const isOpen = expanded === period.id;
            const items = periodItems[period.id] ?? [];
            return (
              <div key={period.id} className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] overflow-hidden">
                <button
                  onClick={() => handleExpand(period)}
                  className="w-full p-4 flex items-center gap-3 text-left hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors"
                >
                  <Receipt size={18} className="text-blue-500 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 dark:text-ink-hi">{formatPeriod(period.period)}</p>
                    <p className="text-xs text-slate-400 dark:text-ink-low">
                      Total: ${Number(period.total_amount).toLocaleString('es-AR')} · Vence: {new Date(period.due_date).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-white/[0.07] p-4 space-y-3">
                    {/* Distribuir por coeficiente */}
                    {items.length > 0 ? (
                      <div className="flex items-center justify-between gap-3 bg-emerald-50 dark:bg-emerald-400/[0.10] border border-emerald-200 dark:border-emerald-800 rounded-xl p-3">
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 size={14} /> Distribuida a {items.length} unidades segun coeficiente.
                        </p>
                        {items.every(i => i.status === 'pending') && (
                          <button
                            onClick={() => handleDistribute(period, true)}
                            disabled={saving === period.id}
                            title="Borra y recalcula (solo si nadie informo o pago aun)"
                            className="flex items-center gap-1.5 bg-slate-200 dark:bg-surface-panel2 hover:bg-slate-300 dark:hover:bg-white/[0.1] disabled:opacity-60 text-slate-700 dark:text-ink-mid px-3 py-2 rounded-lg text-xs font-semibold transition-colors shrink-0"
                          >
                            {saving === period.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                            Re-distribuir
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-surface-inset rounded-xl p-3">
                        <p className="text-xs text-slate-500 dark:text-ink-mid">
                          Distribuye ${Number(period.total_amount).toLocaleString('es-AR')} entre las unidades segun su coeficiente.
                        </p>
                        <button
                          onClick={() => handleDistribute(period)}
                          disabled={saving === period.id}
                          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors shrink-0"
                        >
                          {saving === period.id ? <Loader2 size={12} className="animate-spin" /> : <Users size={12} />}
                          Distribuir por coeficiente
                        </button>
                      </div>
                    )}

                    {/* Ítems */}
                    {loadingItems === period.id ? (
                      <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-blue-500" /></div>
                    ) : items.length === 0 ? (
                      <p className="text-sm text-slate-400 dark:text-ink-low text-center py-4">Sin ítems distribuidos aún</p>
                    ) : (
                      <div className="space-y-2">
                        {items.map(item => (
                          <div key={item.id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 dark:border-white/[0.07] last:border-0">
                            <div>
                              <span className="font-medium text-slate-700 dark:text-ink-mid">
                                Unidad {item.unit_id}
                              </span>
                              {item.profiles?.full_name && (
                                <span className="text-slate-400 dark:text-ink-low ml-2">({item.profiles.full_name})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 dark:text-ink-hi font-mono">
                                ${Number(item.amount).toLocaleString('es-AR')}
                              </span>
                              {item.status === 'paid' ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">Pagado</span>
                              ) : item.status === 'reported' ? (
                                <>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-brand-400">Informado</span>
                                  <button onClick={() => handleDecideItem(period.id, item, 'approve')} disabled={decidingItem === item.id} className="flex items-center bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white px-2 py-1 rounded-lg transition-colors" title="Aprobar pago">
                                    {decidingItem === item.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                                  </button>
                                  <button onClick={() => handleDecideItem(period.id, item, 'reject')} disabled={decidingItem === item.id} className="flex items-center bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white px-2 py-1 rounded-lg transition-colors" title="Rechazar">
                                    <X size={11} />
                                  </button>
                                </>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">Pendiente</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
