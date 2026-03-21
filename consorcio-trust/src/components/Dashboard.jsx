import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { DollarSign, AlertCircle, Calendar, UploadCloud, TrendingUp, CheckCircle, Clock, XCircle } from 'lucide-react';
import { CHART_COLORS } from '../lib/constants';
import { formatDate, formatCurrency } from '../lib/utils';

const PAYMENT_STATUS = {
  approved: { label: 'Aprobado', icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
  pending: { label: 'Pendiente', icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
  rejected: { label: 'Rechazado', icon: XCircle, color: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30' },
};

function StatCard({ icon: Icon, iconBg, iconColor, label, value, subtitle, subtitleColor, action }) {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all group relative overflow-hidden">
      <div className="absolute -right-4 -top-4 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity">
        <Icon size={100} />
      </div>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1.5">{value}</h3>
          {subtitle && (
            <p className={`text-xs mt-1.5 font-medium ${subtitleColor || 'text-slate-500 dark:text-slate-400'}`}>{subtitle}</p>
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
    <div className="bg-white dark:bg-slate-700 px-4 py-3 rounded-xl shadow-lg border border-slate-100 dark:border-slate-600">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{payload[0].name}</p>
      <p className="text-sm text-blue-600 dark:text-blue-400 font-bold">${payload[0].value.toLocaleString('es-AR')}</p>
    </div>
  );
}

export default function Dashboard({ reclamos, gastos, payments = [], session, onPaymentClick }) {
  const userClaimsCount = reclamos.filter((r) => r.user_id === session.user.id).length;

  const displayPayments = payments.length > 0 ? payments.slice(0, 6) : [];

  const totalExpenses = gastos.reduce((sum, g) => sum + g.value, 0);
  const expenseLabel = totalExpenses > 0 ? `$${totalExpenses.toLocaleString('es-AR')}` : '$—';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard
          icon={DollarSign}
          iconBg="bg-emerald-50 dark:bg-emerald-900/30"
          iconColor="text-emerald-500"
          label="Expensas del Mes"
          value={expenseLabel}
          subtitle={totalExpenses > 0 ? "Calculado de gastos registrados" : "Sin datos de expensas"}
          subtitleColor={totalExpenses > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}
          action={
            <button
              onClick={onPaymentClick}
              className="mt-4 w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100 dark:shadow-emerald-900/30 hover:shadow-emerald-200"
            >
              <UploadCloud size={16} /> Informar Pago
            </button>
          }
        />

        <StatCard
          icon={AlertCircle}
          iconBg="bg-orange-50 dark:bg-orange-900/30"
          iconColor="text-orange-500"
          label="Mis Reclamos"
          value={userClaimsCount}
          subtitle="Activos actualmente"
        />

        <StatCard
          icon={Calendar}
          iconBg="bg-blue-50 dark:bg-blue-900/30"
          iconColor="text-blue-500"
          label="Últimos Pagos"
          value={displayPayments.length}
          subtitle="Pagos registrados"
          subtitleColor="text-blue-600 dark:text-blue-400"
        />
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Destino de tus Fondos</h3>
        </div>

        {gastos.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
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
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-sm text-slate-600 dark:text-slate-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
            <TrendingUp size={48} className="mb-3 opacity-30" />
            <p className="font-medium">Sin datos de gastos cargados</p>
            <p className="text-sm mt-1">Los gastos aparecerán aquí cuando se registren</p>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Historial de Pagos</h3>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            {displayPayments.length > 0 ? `Últimos ${displayPayments.length}` : 'Sin registros'}
          </span>
        </div>

        {displayPayments.length > 0 ? (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left py-3 font-semibold">Fecha</th>
                  <th className="text-left py-3 font-semibold">Monto</th>
                  <th className="text-right py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {displayPayments.map((pay) => {
                  const status = PAYMENT_STATUS[pay.status] || PAYMENT_STATUS.pending;
                  const StatusIcon = status.icon;
                  return (
                    <tr key={pay.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 text-sm text-slate-700 dark:text-slate-300">
                        {formatDate(pay.created_at, 'short')}
                      </td>
                      <td className="py-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {pay.amount ? formatCurrency(pay.amount) : 'Comprobante'}
                      </td>
                      <td className="py-3 text-right">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${status.bg} ${status.color}`}>
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500">
            <DollarSign size={40} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No hay pagos registrados</p>
            <p className="text-xs mt-1">Usá el botón "Informar Pago" para enviar tu comprobante</p>
          </div>
        )}
      </div>
    </div>
  );
}
