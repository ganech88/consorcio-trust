import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import {
  DollarSign, AlertCircle, UploadCloud, TrendingUp, CheckCircle, Clock,
  XCircle, Calendar, Wrench, MessageSquare,
} from 'lucide-react';
import { CHART_COLORS, CHART_COLORS_DARK, VIEWS } from '../lib/constants';
import { formatDate, formatCurrency } from '../lib/utils';
import { useTheme } from '../lib/ThemeContext';

const PAYMENT_STATUS = {
  approved: { label: 'Aprobado', icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-400/[0.14]', dot: 'bg-emerald-500' },
  pending:  { label: 'Pendiente', icon: Clock,        color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-400/[0.14]',   dot: 'bg-amber-500' },
  rejected: { label: 'Rechazado', icon: XCircle,      color: 'text-red-500 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-400/[0.14]',       dot: 'bg-red-500' },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function getDateSpanish() {
  return new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function StatCard({ icon: Icon, iconBg, iconColor, label, value, subtitle, subtitleColor, action }) {
  return (
    <div className="bg-white dark:bg-surface-panel p-6 rounded-2xl border border-slate-100 dark:border-white/[0.07] transition-all group relative overflow-hidden">
      <div className="absolute -right-4 -top-4 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity">
        <Icon size={100} />
      </div>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-xs font-bold text-slate-400 dark:text-ink-low uppercase tracking-wider">{label}</p>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-ink-hi mt-1.5">{value}</h3>
          {subtitle && (
            <p className={`text-xs mt-1.5 font-medium ${subtitleColor || 'text-slate-500 dark:text-ink-mid'}`}>{subtitle}</p>
          )}
          {action}
        </div>
        <div className={`${iconBg} p-3 rounded-xl shrink-0`}>
          <Icon size={22} className={iconColor} />
        </div>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-surface-panel2 px-4 py-3 rounded-xl shadow-lg border border-slate-100 dark:border-white/[0.09]">
      <p className="text-sm font-semibold text-slate-800 dark:text-ink-hi">{payload[0].name}</p>
      <p className="text-sm text-brand-600 dark:text-brand-400 font-bold">${payload[0].value.toLocaleString('es-AR')}</p>
    </div>
  );
}

function PaymentTimeline({ payments }) {
  if (!payments.length) {
    return (
      <div className="py-12 text-center text-slate-400 dark:text-ink-low">
        <DollarSign size={40} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm font-medium">No hay pagos registrados</p>
        <p className="text-xs mt-1">Usá el botón "Informar Pago" para enviar tu comprobante</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-2 top-2 bottom-2 w-px bg-slate-100 dark:bg-surface-panel2" />

      <div className="space-y-4">
        {payments.map((pay) => {
          const status = PAYMENT_STATUS[pay.status] || PAYMENT_STATUS.pending;
          const StatusIcon = status.icon;
          return (
            <div key={pay.id} className="relative flex items-start gap-4">
              {/* Dot */}
              <div className={`absolute -left-[18px] mt-1 w-3 h-3 rounded-full border-2 border-white dark:border-white/[0.07] ${status.dot} shrink-0`} />

              <div className="flex-1 bg-slate-50 dark:bg-surface-inset rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-ink-hi">
                    {pay.amount ? formatCurrency(pay.amount) : 'Comprobante adjunto'}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-ink-low mt-0.5">
                    {formatDate(pay.created_at, 'short')}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${status.bg} ${status.color} shrink-0`}>
                  <StatusIcon size={11} />
                  {status.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard({ reclamos, gastos, payments = [], session, userProfile, onPaymentClick, onNavigate }) {
  const { dark } = useTheme();
  const chartColors = dark ? CHART_COLORS_DARK : CHART_COLORS;

  const userClaimsCount = reclamos.filter((r) => r.user_id === session.user.id).length;
  const displayPayments = payments.slice(0, 6);
  const totalExpenses = gastos.reduce((sum, g) => sum + g.value, 0);
  const expenseLabel = totalExpenses > 0 ? `$${totalExpenses.toLocaleString('es-AR')}` : '$—';

  // Claims urgency color
  const claimsIconBg =
    userClaimsCount === 0 ? 'bg-emerald-50 dark:bg-emerald-400/[0.14]' :
    userClaimsCount <= 2   ? 'bg-amber-50 dark:bg-amber-400/[0.14]' :
                             'bg-red-50 dark:bg-red-400/[0.14]';
  const claimsIconColor =
    userClaimsCount === 0 ? 'text-emerald-500' :
    userClaimsCount <= 2   ? 'text-amber-500' :
                             'text-red-500';

  const firstName = userProfile?.full_name?.split(' ')[0] || '';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting strip */}
      <div className="bg-white dark:bg-surface-panel border border-slate-100 dark:border-white/[0.07] rounded-2xl px-6 py-5 text-slate-900 dark:text-ink-hi">
        <p className="text-brand-600 dark:text-brand-400 text-sm capitalize font-mono">{getDateSpanish()}</p>
        <h2 className="text-2xl font-bold mt-1 font-display">
          {getGreeting()}{firstName ? `, ${firstName}` : ''}
        </h2>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={onPaymentClick}
          className="bg-white dark:bg-surface-panel border border-slate-100 dark:border-white/[0.07] rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-brand-300 dark:hover:border-brand-600 transition-all group"
        >
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-400/[0.14] rounded-xl flex items-center justify-center group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors">
            <UploadCloud size={22} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-xs font-semibold text-slate-600 dark:text-ink-mid text-center leading-tight">Informar Pago</span>
        </button>

        <button
          onClick={() => onNavigate?.(VIEWS.CLAIMS)}
          className="bg-white dark:bg-surface-panel border border-slate-100 dark:border-white/[0.07] rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-brand-300 dark:hover:border-brand-600 transition-all group"
        >
          <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/30 rounded-xl flex items-center justify-center group-hover:bg-orange-100 dark:group-hover:bg-orange-900/50 transition-colors">
            <AlertCircle size={22} className="text-orange-500 dark:text-orange-400" />
          </div>
          <span className="text-xs font-semibold text-slate-600 dark:text-ink-mid text-center leading-tight">Nuevo Reclamo</span>
        </button>

        <button
          onClick={() => onNavigate?.(VIEWS.AMENITIES)}
          className="bg-white dark:bg-surface-panel border border-slate-100 dark:border-white/[0.07] rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-brand-300 dark:hover:border-brand-600 transition-all group"
        >
          <div className="w-12 h-12 bg-brand-50 dark:bg-brand-400/[0.14] rounded-xl flex items-center justify-center group-hover:bg-brand-100 dark:group-hover:bg-brand-900/50 transition-colors">
            <Calendar size={22} className="text-brand-600 dark:text-brand-400" />
          </div>
          <span className="text-xs font-semibold text-slate-600 dark:text-ink-mid text-center leading-tight">Reservar</span>
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard
          icon={DollarSign}
          iconBg="bg-emerald-50 dark:bg-emerald-400/[0.14]"
          iconColor="text-emerald-500"
          label="Gastos del consorcio"
          value={expenseLabel}
          subtitle={totalExpenses > 0 ? 'Calculado de gastos registrados' : 'Sin datos de expensas'}
          subtitleColor={totalExpenses > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}
          action={
            <button
              onClick={onPaymentClick}
              className="mt-4 w-full bg-brand-500 hover:bg-brand-400 text-[#04201d] py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <UploadCloud size={16} /> Informar Pago
            </button>
          }
        />

        <StatCard
          icon={AlertCircle}
          iconBg={claimsIconBg}
          iconColor={claimsIconColor}
          label="Mis Reclamos"
          value={userClaimsCount}
          subtitle={
            userClaimsCount === 0 ? 'Sin reclamos activos' :
            userClaimsCount <= 2  ? 'Reclamos en curso' :
                                    'Varios reclamos pendientes'
          }
          subtitleColor={
            userClaimsCount === 0 ? 'text-emerald-600 dark:text-emerald-400' :
            userClaimsCount <= 2  ? 'text-amber-600 dark:text-amber-400' :
                                    'text-red-500 dark:text-red-400'
          }
        />

        <StatCard
          icon={Calendar}
          iconBg="bg-brand-50 dark:bg-brand-400/[0.14]"
          iconColor="text-brand-500"
          label="Últimos Pagos"
          value={displayPayments.length}
          subtitle="Pagos registrados"
          subtitleColor="text-brand-600 dark:text-brand-400"
        />
      </div>

      {/* Pie chart — clickable */}
      <div className="bg-white dark:bg-surface-panel p-6 rounded-2xl border border-slate-100 dark:border-white/[0.07] transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-brand-600 dark:text-brand-400" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-ink-hi">Destino de tus Fondos</h3>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate(VIEWS.FINANCE)}
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium"
            >
              Ver finanzas →
            </button>
          )}
        </div>

        {gastos.length > 0 ? (
          <div className="h-72 cursor-pointer" onClick={() => onNavigate?.(VIEWS.FINANCE)}>
            <ResponsiveContainer width="99%" height={288} minWidth={0}>
              <PieChart>
                <Pie
                  data={gastos}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                >
                  {gastos.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-sm text-slate-600 dark:text-ink-mid">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 dark:text-ink-low">
            <TrendingUp size={48} className="mb-3 opacity-30" />
            <p className="font-medium">Sin datos de gastos cargados</p>
            <p className="text-sm mt-1">Los gastos aparecerán aquí cuando se registren</p>
          </div>
        )}
      </div>

      {/* Payment timeline */}
      <div className="bg-white dark:bg-surface-panel p-6 rounded-2xl border border-slate-100 dark:border-white/[0.07] transition-colors">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-ink-hi">Historial de Pagos</h3>
          </div>
          <span className="text-xs text-slate-400 dark:text-ink-low font-medium">
            {displayPayments.length > 0 ? `Últimos ${displayPayments.length}` : 'Sin registros'}
          </span>
        </div>
        <PaymentTimeline payments={displayPayments} />
      </div>
    </div>
  );
}
