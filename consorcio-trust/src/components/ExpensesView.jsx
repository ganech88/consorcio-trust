import { useState, useEffect } from 'react';
import { Receipt, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import {
  fetchUserPeriodItems,
  updatePeriodItemStatus,
} from '../services/data.service';
import { useToast } from './Toast';

const STATUS_CONFIG = {
  pending: {
    label: 'Pendiente',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    icon: Clock,
  },
  paid: {
    label: 'Pagado',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    icon: CheckCircle,
  },
};

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);
}

function formatPeriod(period) {
  if (!period) return '';
  const [year, month] = period.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

export default function ExpensesView({ session, userProfile }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchUserPeriodItems(session.user.id)
      .then(setItems)
      .catch(e => toast.error(e.message, 'Error al cargar expensas'))
      .finally(() => setLoading(false));
  }, [session?.user?.id, toast]);

  async function handleMarkPaid(item) {
    setPaying(item.id);
    try {
      const updated = await updatePeriodItemStatus(item.id, 'paid');
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...updated } : i));
      toast.success('Expensa marcada como pagada');
    } catch (e) {
      toast.error(e.message, 'Error al actualizar');
    } finally {
      setPaying(null);
    }
  }

  const current = items[0] ?? null;
  const pending = items.filter(i => i.status === 'pending');
  const totalPending = pending.reduce((s, i) => s + Number(i.amount), 0);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-2xl text-white shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <Receipt size={24} />
          <h3 className="text-xl font-bold">Mis Expensas</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/15 rounded-xl p-3">
            <p className="text-white/70 text-xs font-medium mb-1">Deuda pendiente</p>
            <p className="text-2xl font-bold">{formatCurrency(totalPending)}</p>
          </div>
          <div className="bg-white/15 rounded-xl p-3">
            <p className="text-white/70 text-xs font-medium mb-1">Unidad</p>
            <p className="text-2xl font-bold">{userProfile?.unit_id ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Expensa actual */}
      {current && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
            Período actual
          </h4>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-100 text-lg">
                {formatCurrency(current.amount)}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {formatPeriod(current.expense_periods?.period)}
              </p>
              {current.expense_periods?.due_date && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  Vence: {new Date(current.expense_periods.due_date).toLocaleDateString('es-AR')}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_CONFIG[current.status]?.color}`}>
                {STATUS_CONFIG[current.status]?.label}
              </span>
              {current.status === 'pending' && (
                <button
                  onClick={() => handleMarkPaid(current)}
                  disabled={paying === current.id}
                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                >
                  {paying === current.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                  Marcar pagado
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Historial */}
      <div>
        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-1">
          Historial ({items.length})
        </h4>

        {items.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center">
            <Receipt size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">No tenés expensas registradas aún</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
              El administrador publicará las liquidaciones mensualmente
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => {
              const st = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
              const Icon = st.icon;
              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 flex items-center gap-4"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${st.color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                      {formatPeriod(item.expense_periods?.period)}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Vence: {item.expense_periods?.due_date
                        ? new Date(item.expense_periods.due_date).toLocaleDateString('es-AR')
                        : '—'}
                    </p>
                    {item.paid_at && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                        Pagado: {new Date(item.paid_at).toLocaleDateString('es-AR')}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-slate-800 dark:text-slate-100">{formatCurrency(item.amount)}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                  </div>
                  {item.status === 'pending' && (
                    <button
                      onClick={() => handleMarkPaid(item)}
                      disabled={paying === item.id}
                      className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-60"
                      title="Marcar como pagado"
                    >
                      {paying === item.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
