import { Loader2 } from 'lucide-react';

// ─── Status labels ───────────────────────────────────────────────────────────

export const STATUS_LABELS = {
  open:        { label: 'Abierto',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  pending:     { label: 'En proceso', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  closed:      { label: 'Resuelto',   color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  approved:    { label: 'Aprobada',   color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  rejected:    { label: 'Rechazada',  color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

export const DOC_TYPES_MAP = {
  general:   'General',
  identity:  'Identidad',
  ownership: 'Propiedad',
  request:   'Solicitud',
  complaint: 'Reclamo',
  other:     'Otro',
};

export const DOC_STATUS = {
  pending:      { label: 'Pendiente',   color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  approved:     { label: 'Aprobado',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  rejected:     { label: 'Rechazado',   color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  under_review: { label: 'En revisión', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
};

export const EXPENSE_CATEGORIES = [
  'Mantenimiento', 'Limpieza', 'Electricidad', 'Gas', 'Agua',
  'Seguro', 'Administración', 'Amenities', 'Ascensores', 'Otro',
];

export const ROLE_OPTIONS = [
  { value: 'resident',    label: 'Residente' },
  { value: 'admin',       label: 'Admin' },
  { value: 'owner',       label: 'Propietario' },
  { value: 'super_admin', label: 'Super Admin' },
];

export const ROLE_BADGE = {
  admin:       'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
  super_admin: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  owner:       'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  resident:    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
};

export const EXPENSE_STATUS_LABELS = {
  pending:  { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  partial:  { label: 'Parcial',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  paid:     { label: 'Pagado',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  overdue:  { label: 'Vencido',   color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

export const PAYMENT_STATUS_LABELS = {
  pending:  { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  approved: { label: 'Aprobado',  color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  rejected: { label: 'Rechazado', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

export const FINE_STATUS_LABELS = {
  active:    { label: 'Activa',     color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  paid:      { label: 'Pagada',     color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  cancelled: { label: 'Anulada',    color: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' },
  waived:    { label: 'Condonada',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function fmtCurrency(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

// ─── Utility components ──────────────────────────────────────────────────────

export function LoadingSpinner() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 size={32} className="animate-spin text-blue-500" />
    </div>
  );
}

export function EmptyState({ icon: Icon, text }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center">
      <Icon size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
      <p className="text-slate-500 dark:text-slate-400 text-sm">{text}</p>
    </div>
  );
}
