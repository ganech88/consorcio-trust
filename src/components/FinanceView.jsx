import { useState, useEffect } from 'react';
import { TrendingUp, Plus, Loader2, DollarSign, UploadCloud, FileText } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  fetchExpensesLog,
  addExpenseLog,
  fetchMonthlyFinanceSummary,
  uploadAttachment,
  getSignedComprobanteUrl,
} from '../services/data.service';
import { useToast } from './Toast';

const FINANCE_CATEGORIES = [
  'Mantenimiento', 'Limpieza', 'Electricidad', 'Gas', 'Agua',
  'Seguro', 'Administración', 'Amenities', 'Ascensores',
  'Personal', 'Honorarios', 'Reparaciones', 'Otro',
];

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);
}

function formatMonth(monthStr) {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
}

const CATEGORY_COLORS = {
  Mantenimiento: '#3B82F6',
  Limpieza:      '#10B981',
  Electricidad:  '#F59E0B',
  Gas:           '#F97316',
  Agua:          '#06B6D4',
  Seguro:        '#8B5CF6',
  Administración:'#EC4899',
  Amenities:     '#14B8A6',
  Ascensores:    '#6366F1',
  Personal:      '#84CC16',
  Honorarios:    '#EF4444',
  Reparaciones:  '#78716C',
  Otro:          '#94A3B8',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-surface-panel border border-slate-200 dark:border-white/[0.07] rounded-xl shadow-lg px-4 py-3">
      <p className="text-xs font-bold text-slate-500 dark:text-ink-mid mb-1">{label}</p>
      <p className="text-lg font-bold text-slate-800 dark:text-ink-hi">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
}

function AddExpenseForm({ session, userProfile, onAdded }) {
  const toast = useToast();
  const [form, setForm] = useState({
    description: '',
    category: FINANCE_CATEGORIES[0],
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    provider: '',
  });
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState(null);

  function setField(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Ingresá un monto válido'); return; }
    setSaving(true);
    try {
      let receiptUrl = null;
      if (file) receiptUrl = await uploadAttachment(file, 'egresos');
      const item = await addExpenseLog({
        description: form.description,
        category: form.category,
        amount: Number(form.amount),
        date: form.date,
        provider: form.provider || null,
        receiptUrl,
        consortiumId: userProfile?.consortium_id,
        createdBy: session.user.id,
      });
      onAdded(item);
      toast.success('Gasto registrado');
      setForm({
        description: '',
        category: FINANCE_CATEGORIES[0],
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        provider: '',
      });
      setFile(null);
    } catch (e) {
      toast.error(e.message, 'Error al registrar gasto');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-5 space-y-4"
    >
      <h4 className="font-bold text-slate-800 dark:text-ink-hi text-sm">Registrar gasto</h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">Descripción</label>
          <input
            type="text"
            value={form.description}
            onChange={e => setField('description', e.target.value)}
            placeholder="Ej: Reparación plomería"
            className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">Categoría</label>
          <select
            value={form.category}
            onChange={e => setField('category', e.target.value)}
            className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {FINANCE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">Monto ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={e => setField('amount', e.target.value)}
            placeholder="0"
            className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">Fecha</label>
          <input
            type="date"
            value={form.date}
            onChange={e => setField('date', e.target.value)}
            className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">Proveedor (opcional)</label>
          <input
            type="text"
            value={form.provider}
            onChange={e => setField('provider', e.target.value)}
            placeholder="Ej: Fontanería SA"
            className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">Comprobante (PDF o imagen, opcional)</label>
        <label className={`flex items-center gap-2 cursor-pointer border-2 border-dashed rounded-xl px-3 py-3 text-sm transition-colors ${file ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-400/[0.10] text-emerald-700 dark:text-emerald-400' : 'border-slate-200 dark:border-white/[0.09] text-slate-500 dark:text-ink-mid hover:border-slate-300'}`}>
          <UploadCloud size={16} />
          <span className="truncate">{file ? file.name : 'Adjuntar comprobante'}</span>
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        Registrar Gasto
      </button>
    </form>
  );
}

export default function FinanceView({ session, userProfile }) {
  const toast = useToast();
  const isAdmin = userProfile?.role === 'admin';
  const [expenses, setExpenses] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchExpensesLog(userProfile?.consortium_id),
      fetchMonthlyFinanceSummary(userProfile?.consortium_id),
    ])
      .then(([exp, mon]) => {
        setExpenses(exp);
        setMonthly(mon);
      })
      .catch(e => toast.error(e.message, 'Error al cargar finanzas'))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, toast]);

  function handleAdded(item) {
    setExpenses(prev => [item, ...prev]);
    // Actualizar summary
    const month = item.date?.slice(0, 7);
    if (month) {
      setMonthly(prev => {
        const existing = prev.find(m => m.month === month);
        if (existing) {
          return prev.map(m => m.month === month ? { ...m, total: m.total + Number(item.amount) } : m);
        }
        return [...prev, { month, total: Number(item.amount) }].sort((a, b) => a.month.localeCompare(b.month));
      });
    }
    setShowForm(false);
  }

  const totalThisYear = expenses
    .filter(e => e.date?.startsWith(new Date().getFullYear().toString()))
    .reduce((s, e) => s + Number(e.amount), 0);

  const totalThisMonth = expenses
    .filter(e => e.date?.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((s, e) => s + Number(e.amount), 0);

  const chartData = monthly.map(m => ({ name: formatMonth(m.month), total: m.total }));

  // Category totals
  const byCategory = {};
  expenses.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
  });
  const categoryList = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={32} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-ink-hi flex items-center gap-2">
            <TrendingUp size={22} className="text-emerald-500" />
            Balance Financiero
          </h3>
          <p className="text-sm text-slate-500 dark:text-ink-mid mt-0.5">
            Egresos del consorcio
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus size={16} />
            {showForm ? 'Cancelar' : 'Cargar gasto'}
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-ink-low mb-1">Este mes</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-ink-hi">{formatCurrency(totalThisMonth)}</p>
        </div>
        <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-ink-low mb-1">Este año</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-ink-hi">{formatCurrency(totalThisYear)}</p>
        </div>
      </div>

      {/* Formulario admin */}
      {isAdmin && showForm && (
        <AddExpenseForm session={session} userProfile={userProfile} onAdded={handleAdded} />
      )}

      {/* Gráfico mensual */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-5">
          <h4 className="font-bold text-slate-800 dark:text-ink-hi text-sm mb-4">Egresos mensuales</h4>
          <div className="h-48">
            <ResponsiveContainer width="99%" height={192} minWidth={0}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Por categoría */}
      {categoryList.length > 0 && (
        <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-5">
          <h4 className="font-bold text-slate-800 dark:text-ink-hi text-sm mb-4">Por categoría</h4>
          <div className="space-y-3">
            {categoryList.map(([cat, amount]) => {
              const maxAmount = categoryList[0][1];
              const pct = Math.round((amount / maxAmount) * 100);
              const color = CATEGORY_COLORS[cat] ?? '#94A3B8';
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-ink-mid">{cat}</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-ink-hi">{formatCurrency(amount)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-surface-panel2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de egresos */}
      <div>
        <h4 className="text-xs font-bold text-slate-400 dark:text-ink-low uppercase tracking-wider mb-3 px-1">
          Últimos egresos ({expenses.length})
        </h4>

        {expenses.length === 0 ? (
          <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-12 text-center">
            <DollarSign size={40} className="mx-auto text-slate-300 dark:text-ink-low mb-3" />
            <p className="text-slate-500 dark:text-ink-mid text-sm">No hay egresos registrados</p>
            {isAdmin && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 text-emerald-600 dark:text-emerald-400 text-sm font-semibold hover:underline"
              >
                Registrar el primer gasto
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map(e => {
              const color = CATEGORY_COLORS[e.category] ?? '#94A3B8';
              return (
                <div
                  key={e.id}
                  className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-4 flex items-center gap-4"
                >
                  <div
                    className="w-2.5 h-10 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-ink-hi text-sm truncate">{e.description}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] font-bold bg-slate-100 dark:bg-surface-panel2 text-slate-500 dark:text-ink-mid px-1.5 py-0.5 rounded">
                        {e.category}
                      </span>
                      {e.provider && (
                        <span className="text-xs text-slate-400 dark:text-ink-low">{e.provider}</span>
                      )}
                      <span className="text-xs text-slate-400 dark:text-ink-low">
                        {new Date(e.date).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                  </div>
                  <p className="font-bold text-slate-800 dark:text-ink-hi shrink-0 text-right">
                    {formatCurrency(e.amount)}
                  </p>
                  {e.receipt_url && (
                    <button onClick={async () => { const u = await getSignedComprobanteUrl(e.receipt_url); if (u) window.open(u, '_blank', 'noopener'); }} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-white/[0.06] transition-colors shrink-0" title="Ver comprobante">
                      <FileText size={16} />
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
