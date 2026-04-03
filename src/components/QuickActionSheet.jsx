import { useEffect } from 'react';
import { X, UploadCloud, AlertCircle, Calendar } from 'lucide-react';
import { VIEWS } from '../lib/constants';

export default function QuickActionSheet({ isOpen, onClose, onNavigate, onPaymentClick }) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    {
      label: 'Informar Pago',
      description: 'Enviá tu comprobante',
      icon: UploadCloud,
      iconBg: 'bg-emerald-50 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      onClick: () => { onPaymentClick?.(); onClose(); },
    },
    {
      label: 'Nuevo Reclamo',
      description: 'Reportá un problema',
      icon: AlertCircle,
      iconBg: 'bg-orange-50 dark:bg-orange-900/30',
      iconColor: 'text-orange-500 dark:text-orange-400',
      onClick: () => { onNavigate?.(VIEWS.CLAIMS); onClose(); },
    },
    {
      label: 'Reservar Espacio',
      description: 'SUM, piscina, coworking...',
      icon: Calendar,
      iconBg: 'bg-brand-50 dark:bg-brand-900/30',
      iconColor: 'text-brand-600 dark:text-brand-400',
      onClick: () => { onNavigate?.(VIEWS.AMENITIES); onClose(); },
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white dark:bg-slate-800 rounded-t-3xl shadow-2xl border-t border-slate-100 dark:border-slate-700 animate-fade-in-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 dark:bg-slate-600 rounded-full" />
        </div>

        <div className="px-5 pb-2 pt-3 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Acciones rápidas</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-8 pt-2 space-y-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={action.onClick}
                className="w-full flex items-center gap-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl px-4 py-4 transition-colors text-left"
              >
                <div className={`w-12 h-12 ${action.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                  <Icon size={22} className={action.iconColor} />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{action.label}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{action.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
