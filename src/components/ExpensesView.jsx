import { useState, useEffect } from 'react';
import { Receipt, CheckCircle, Clock, AlertCircle, Loader2, X, CreditCard, ChevronDown, ChevronUp, Gavel } from 'lucide-react';
import { fetchExpenses, createExpensePayment, fetchMyFines } from '../services/data.service';
import { useToast } from './Toast';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', icon: Clock },
  partial: { label: 'Parcial',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',   icon: Clock },
  paid:    { label: 'Pagado',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', icon: CheckCircle },
  overdue: { label: 'Vencido',   color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',        icon: AlertCircle },
};

const PAYMENT_STATUS_CONFIG = {
  pending:  { label: 'Pendiente de aprobación', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  approved: { label: 'Aprobado',                color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  rejected: { label: 'Rechazado',               color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
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

function PaymentModal({ expense, userId, onClose, onPaid }) {
  const toast = useToast();
  const [amount, setAmount] = useState(String(expense.amount));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Ingresá un monto válido');
      return;
    }
    setSaving(true);
    try {
      const payment = await createExpensePayment(expense.id, userId, {
        amount: Number(amount),
        notes: notes.trim() || null,
      });
      toast.success('Pago registrado. El administrador lo revisará pronto.');
      onPaid(expense.id, payment);
      onClose();
    } catch (err) {
      toast.error(err.message, 'Error al registrar pago');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
          <h4 className="font-bold text-slate-800 dark:text-slate-100">Registrar pago</h4>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-3">
            <p className="text-xs font-semibold text-brand-700 dark:text-brand-400">{expense.title}</p>
            <p className="text-xs text-brand-600/70 dark:text-brand-400/70 mt-0.5">
              {formatPeriod(expense.period)} · Total: {formatCurrency(expense.amount)}
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Monto a pagar ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Transferencia banco / número de operación..."
              rows={2}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
            Registrar pago
          </button>
        </form>
      </div>
    </div>
  );
}

const FINE_STATUS_LABELS = {
  active:    'Pendiente',
  paid:      'Pagada',
  cancelled: 'Anulada',
  waived:    'Condonada',
};

export default function ExpensesView({ session, userProfile }) {
  const toast = useToast();
  const [expenses, setExpenses] = useState([]);
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payTarget, setPayTarget] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!userProfile?.consortium_id) return;
    Promise.all([
      fetchExpenses(userProfile.consortium_id),
      fetchMyFines(session?.user?.id),
    ])
      .then(([exp, myFines]) => {
        setExpenses(exp);
        setFines(myFines);
      })
      .catch(e => toast.error(e.message, 'Error al cargar expensas'))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, session?.user?.id, toast]);

  function handlePaid(expenseId, payment) {
    setExpenses(prev => prev.map(e =>
      e.id === expenseId
        ? { ...e, expense_payments: [...(e.expense_payments || []), payment] }
        : e
    ));
  }

  const currentPeriod = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const currentExpenses = expenses.filter(e => e.period === currentPeriod);
  const myPayments = expenses.flatMap(e =>
    (e.expense_payments || [])
      .filter(p => p.user_id === session?.user?.id)
      .map(p => ({ ...p, expenseTitle: e.title, expensePeriod: e.period }))
  );
  const activeFines = fines.filter(f => f.status === 'active');
  const totalFines = activeFines.reduce((s, f) => s + Number(f.amount), 0);
  const totalPending = expenses
    .filter(e => e.status === 'pending' || e.status === 'overdue')
    .reduce((s, e) => s + Number(e.amount), 0) + totalFines;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={32} className="animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-700 p-6 rounded-2xl text-white shadow-lg">
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
            <p className="text-2xl font-bold">{userProfile?.unit_label ?? userProfile?.unit_id ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Período actual */}
      {currentExpenses.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-1">
            Período actual — {formatPeriod(currentPeriod)}
          </h4>
          <div className="space-y-3">
            {currentExpenses.map(exp => {
              const st = STATUS_CONFIG[exp.status] || STATUS_CONFIG.pending;
              const Icon = st.icon;
              const myPay = (exp.expense_payments || []).find(p => p.user_id === session?.user?.id);
              const canPay = !myPay && (exp.status === 'pending' || exp.status === 'overdue' || exp.status === 'partial');
              return (
                <div key={exp.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${st.color}`}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100">{exp.title}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{formatCurrency(exp.amount)}</p>
                        {exp.due_date && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                            <AlertCircle size={11} />
                            Vence: {new Date(exp.due_date).toLocaleDateString('es-AR')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${st.color}`}>{st.label}</span>
                      {myPay ? (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PAYMENT_STATUS_CONFIG[myPay.status]?.color}`}>
                          {PAYMENT_STATUS_CONFIG[myPay.status]?.label}
                        </span>
                      ) : canPay ? (
                        <button
                          onClick={() => setPayTarget(exp)}
                          className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                        >
                          <CreditCard size={12} /> Registrar pago
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {exp.description && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 pl-13">{exp.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Historial de todas las expensas */}
      <div>
        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-1">
          Todas las expensas ({expenses.length})
        </h4>
        {expenses.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center">
            <Receipt size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">No hay expensas registradas aún</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
              El administrador publicará las liquidaciones mensualmente
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map(exp => {
              const st = STATUS_CONFIG[exp.status] || STATUS_CONFIG.pending;
              const myPay = (exp.expense_payments || []).find(p => p.user_id === session?.user?.id);
              const canPay = !myPay && (exp.status === 'pending' || exp.status === 'overdue' || exp.status === 'partial');
              const isExpanded = expandedId === exp.id;
              return (
                <div key={exp.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                  <div className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{exp.title}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {formatPeriod(exp.period)}
                        {exp.due_date ? ` · Vence ${new Date(exp.due_date).toLocaleDateString('es-AR')}` : ''}
                      </p>
                    </div>
                    <p className="font-bold text-slate-800 dark:text-slate-100 shrink-0">{formatCurrency(exp.amount)}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${st.color}`}>{st.label}</span>
                    {canPay && (
                      <button
                        onClick={() => setPayTarget(exp)}
                        className="flex items-center gap-1 bg-brand-600 hover:bg-brand-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0"
                      >
                        <CreditCard size={11} /> Pagar
                      </button>
                    )}
                    {myPay && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : exp.id)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors shrink-0"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    )}
                  </div>
                  {isExpanded && myPay && (
                    <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Mi pago
                      </p>
                      <div className="flex items-center gap-3 text-xs">
                        <CreditCard size={12} className="text-slate-400" />
                        <span className="text-slate-700 dark:text-slate-300">{formatCurrency(myPay.amount)}</span>
                        <span className="text-slate-400">{new Date(myPay.paid_at).toLocaleDateString('es-AR')}</span>
                        <span className={`px-1.5 py-0.5 rounded-full font-bold text-[10px] ${PAYMENT_STATUS_CONFIG[myPay.status]?.color}`}>
                          {PAYMENT_STATUS_CONFIG[myPay.status]?.label}
                        </span>
                      </div>
                      {myPay.notes && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 ml-5">{myPay.notes}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial de mis pagos */}
      {myPayments.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-1">
            Mis pagos registrados ({myPayments.length})
          </h4>
          <div className="space-y-2">
            {myPayments.map(p => {
              const pst = PAYMENT_STATUS_CONFIG[p.status] || PAYMENT_STATUS_CONFIG.pending;
              return (
                <div key={p.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 flex items-center gap-3">
                  <CreditCard size={16} className="text-brand-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{p.expenseTitle}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {formatPeriod(p.expensePeriod)} · {new Date(p.paid_at).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <p className="font-bold text-slate-800 dark:text-slate-100 shrink-0">{formatCurrency(p.amount)}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${pst.color}`}>{pst.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Multas activas */}
      {activeFines.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-red-400 dark:text-red-500 uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5">
            <Gavel size={13} /> Multas aplicadas ({activeFines.length})
          </h4>
          <div className="space-y-2">
            {activeFines.map(fine => (
              <div key={fine.id} className="bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                  <Gavel size={16} className="text-red-500 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-red-800 dark:text-red-200 text-sm">{fine.reason}</p>
                  <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                    {new Date(fine.fine_date).toLocaleDateString('es-AR')}
                    {fine.period ? ` · Período ${fine.period}` : ''}
                  </p>
                  {fine.notes && (
                    <p className="text-xs text-red-400 dark:text-red-500 mt-1">{fine.notes}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-red-700 dark:text-red-300">{formatCurrency(fine.amount)}</p>
                  <span className="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase">
                    {FINE_STATUS_LABELS[fine.status]}
                  </span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between bg-red-100 dark:bg-red-900/30 rounded-xl px-4 py-2.5">
              <span className="text-xs font-bold text-red-700 dark:text-red-300">Total multas</span>
              <span className="font-bold text-red-700 dark:text-red-300">{formatCurrency(totalFines)}</span>
            </div>
          </div>
        </div>
      )}

      {payTarget && (
        <PaymentModal
          expense={payTarget}
          userId={session.user.id}
          onClose={() => setPayTarget(null)}
          onPaid={handlePaid}
        />
      )}
    </div>
  );
}
