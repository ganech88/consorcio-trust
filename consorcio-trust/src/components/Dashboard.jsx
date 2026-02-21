import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { DollarSign, AlertCircle, Calendar, UploadCloud, TrendingUp, CheckCircle, Clock, XCircle } from 'lucide-react';
import { CHART_COLORS } from '../lib/constants';

const MOCK_PAYMENTS = [
  { id: 1, date: '2026-02-10', amount: 85400, status: 'approved', method: 'Transferencia' },
  { id: 2, date: '2026-01-08', amount: 82100, status: 'approved', method: 'Transferencia' },
  { id: 3, date: '2025-12-05', amount: 79800, status: 'approved', method: 'Efectivo' },
  { id: 4, date: '2025-11-12', amount: 79800, status: 'rejected', method: 'Transferencia' },
];

const PAYMENT_STATUS = {
  approved: { label: 'Aprobado', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  pending: { label: 'Pendiente', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  rejected: { label: 'Rechazado', icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
};

function StatCard({ icon: Icon, iconBg, iconColor, label, value, subtitle, subtitleColor, action }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group relative overflow-hidden">
      <div className="absolute -right-4 -top-4 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity">
        <Icon size={100} />
      </div>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
          <h3 className="text-3xl font-bold text-slate-800 mt-1.5">{value}</h3>
          {subtitle && (
            <p className={`text-xs mt-1.5 font-medium ${subtitleColor || 'text-slate-500'}`}>{subtitle}</p>
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
    <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-slate-100">
      <p className="text-sm font-semibold text-slate-800">{payload[0].name}</p>
      <p className="text-sm text-blue-600 font-bold">${payload[0].value.toLocaleString('es-AR')}</p>
    </div>
  );
}

export default function Dashboard({ reclamos, gastos, session, onPaymentClick }) {
  const userClaimsCount = reclamos.filter((r) => r.user_id === session.user.id).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <StatCard
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-500"
          label="Expensas Enero"
          value="$85,400"
          subtitle="Vence en 3 días"
          subtitleColor="text-red-500"
          action={
            <button
              onClick={onPaymentClick}
              className="mt-4 w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100 hover:shadow-emerald-200"
            >
              <UploadCloud size={16} /> Informar Pago
            </button>
          }
        />

        <StatCard
          icon={AlertCircle}
          iconBg="bg-orange-50"
          iconColor="text-orange-500"
          label="Mis Reclamos"
          value={userClaimsCount}
          subtitle="Activos actualmente"
        />

        <StatCard
          icon={Calendar}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          label="Próx. Reserva"
          value="SUM"
          subtitle="Sáb 20hs - Confirmada"
          subtitleColor="text-emerald-600"
        />
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">Destino de tus Fondos</h3>
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
                  formatter={(value) => <span className="text-sm text-slate-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <TrendingUp size={48} className="mb-3 opacity-30" />
            <p className="font-medium">Sin datos de gastos cargados</p>
            <p className="text-sm mt-1">Los gastos aparecerán aquí cuando se registren</p>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-800">Historial de Pagos</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Últimos 4 meses</span>
        </div>

        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="text-left py-3 font-semibold">Fecha</th>
                <th className="text-left py-3 font-semibold">Monto</th>
                <th className="text-left py-3 font-semibold">Medio</th>
                <th className="text-right py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {MOCK_PAYMENTS.map((pay) => {
                const status = PAYMENT_STATUS[pay.status] || PAYMENT_STATUS.pending;
                const StatusIcon = status.icon;
                return (
                  <tr key={pay.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 text-sm text-slate-700">
                      {new Date(pay.date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3 text-sm font-semibold text-slate-800">
                      ${pay.amount.toLocaleString('es-AR')}
                    </td>
                    <td className="py-3 text-sm text-slate-500">{pay.method}</td>
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
      </div>
    </div>
  );
}
