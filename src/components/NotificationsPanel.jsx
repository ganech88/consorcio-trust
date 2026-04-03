import { useState, useEffect, useRef, useMemo } from 'react';
import { Bell, CheckCircle, Clock, AlertCircle, X, MessageSquare } from 'lucide-react';

function generateNotifications(reclamos, payments) {
  const notifs = [];

  reclamos.slice(0, 3).forEach((r) => {
    notifs.push({
      id: `claim-${r.id}`,
      icon: MessageSquare,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-900/30',
      title: r.status === 'closed' ? 'Reclamo resuelto' : 'Reclamo actualizado',
      body: r.title,
      time: r.created_at,
    });
  });

  payments.slice(0, 3).forEach((p) => {
    const isApproved = p.status === 'approved';
    notifs.push({
      id: `pay-${p.id}`,
      icon: isApproved ? CheckCircle : p.status === 'rejected' ? AlertCircle : Clock,
      color: isApproved ? 'text-emerald-500' : p.status === 'rejected' ? 'text-red-500' : 'text-amber-500',
      bg: isApproved ? 'bg-emerald-50 dark:bg-emerald-900/30' : p.status === 'rejected' ? 'bg-red-50 dark:bg-red-900/30' : 'bg-amber-50 dark:bg-amber-900/30',
      title: isApproved ? 'Pago aprobado' : p.status === 'rejected' ? 'Pago rechazado' : 'Pago en revisión',
      body: p.amount ? `$${Number(p.amount).toLocaleString('es-AR')}` : 'Comprobante enviado',
      time: p.created_at,
    });
  });

  return notifs.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);
}

export default function NotificationsPanel({ isOpen, onClose, reclamos = [], payments = [] }) {
  const panelRef = useRef(null);
  const notifications = useMemo(
    () => generateNotifications(reclamos, payments),
    [reclamos, payments]
  );

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 animate-scale-in overflow-hidden"
    >
      <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Bell size={18} />
          Notificaciones
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
          <X size={16} />
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500">
            <Bell size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sin notificaciones nuevas</p>
          </div>
        ) : (
          notifications.map((n) => {
            const Icon = n.icon;
            const timeAgo = n.time ? new Date(n.time).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : '';
            return (
              <div key={n.id} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                <div className="flex gap-3">
                  <div className={`p-2 rounded-lg ${n.bg} shrink-0`}>
                    <Icon size={16} className={n.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{n.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{n.body}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{timeAgo}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
