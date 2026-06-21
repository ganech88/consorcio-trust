import { Calendar, Banknote, AlertCircle, ChevronRight, CheckCircle2 } from 'lucide-react';

const CARDS = [
  { key: 'reservas', tab: 'reservations', label: 'Reservas por aprobar', icon: Calendar,    accent: 'text-blue-500' },
  { key: 'pagos',    tab: 'expenses',     label: 'Pagos por aprobar',    icon: Banknote,    accent: 'text-emerald-500' },
  { key: 'reclamos', tab: 'claims',       label: 'Reclamos abiertos',    icon: AlertCircle, accent: 'text-amber-500' },
];

export default function AdminHome({ counts, onGo }) {
  const total = (counts?.reservas || 0) + (counts?.pagos || 0) + (counts?.reclamos || 0);
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-ink-mid">
        {total === 0
          ? '¡Todo al día! No tenés nada pendiente por aprobar.'
          : `Tenés ${total} cosa${total !== 1 ? 's' : ''} esperando tu revisión.`}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {CARDS.map(c => {
          const n = counts?.[c.key] ?? 0;
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              onClick={() => onGo(c.tab)}
              className="text-left bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-5 hover:border-slate-300 dark:hover:border-white/20 transition-colors"
            >
              <div className="flex items-center justify-between">
                <Icon size={22} className={c.accent} />
                {n > 0 ? (
                  <span className="min-w-[22px] h-[22px] px-1.5 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">{n}</span>
                ) : (
                  <CheckCircle2 size={20} className="text-emerald-500" />
                )}
              </div>
              <p className="text-3xl font-bold text-slate-800 dark:text-ink-hi mt-3 font-mono">{n}</p>
              <p className="text-sm text-slate-500 dark:text-ink-mid mt-0.5 flex items-center gap-1">
                {c.label}
                <ChevronRight size={14} className="text-slate-300 dark:text-ink-low" />
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
