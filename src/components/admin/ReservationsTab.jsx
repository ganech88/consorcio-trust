import { useState, useEffect } from 'react';
import { Calendar, Check, X, Loader2 } from 'lucide-react';
import { fetchAllReservations, updateReservationStatus } from '../../services/data.service';
import { useToast } from '../Toast';
import { STATUS_LABELS, LoadingSpinner, EmptyState } from './shared';

export default function ReservationsTab() {
  const toast = useToast();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [saving, setSaving] = useState(null);
  const [noteInputs, setNoteInputs] = useState({});

  useEffect(() => {
    fetchAllReservations()
      .then(setReservations)
      .catch(e => toast.error(e.message, 'Error al cargar reservas'))
      .finally(() => setLoading(false));
  }, [toast]);

  async function handleAction(res, status) {
    setSaving(res.id);
    try {
      const updated = await updateReservationStatus(res.id, status, noteInputs[res.id] || undefined);
      setReservations(prev => prev.map(r => r.id === res.id ? { ...r, ...updated, profiles: r.profiles } : r));
      toast.success(status === 'approved' ? 'Reserva aprobada' : 'Reserva rechazada');
    } catch (e) {
      toast.error(e.message, 'Error al actualizar reserva');
    } finally {
      setSaving(null);
    }
  }

  const filtered = filter === 'all' ? reservations : reservations.filter(r => r.status === filter);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {['pending', 'approved', 'rejected', 'all'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === s
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-surface-panel text-slate-600 dark:text-ink-mid border border-slate-200 dark:border-white/[0.07] hover:bg-slate-50 dark:hover:bg-white/[0.06]'
            }`}
          >
            {s === 'all' ? 'Todas' : STATUS_LABELS[s]?.label ?? s}
            {s !== 'all' && (
              <span className="ml-1.5 opacity-70">
                ({reservations.filter(r => r.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Calendar} text="No hay reservas en esta categoría" />
      ) : (
        filtered.map(res => {
          const st = STATUS_LABELS[res.status] || STATUS_LABELS.pending;
          const userName = res.profiles?.full_name || 'Usuario';
          const unitId = res.profiles?.unit_id || '—';
          const isPending = res.status === 'pending';

          return (
            <div key={res.id} className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-4">
              <div className="flex items-start gap-3">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 mt-0.5 ${st.color}`}>
                  {st.label}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-ink-hi">{res.amenity_name}</p>
                  <p className="text-xs text-slate-400 dark:text-ink-low mt-0.5">
                    {userName} · Unidad {unitId}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-ink-mid mt-1">
                    {new Date(res.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} · {res.time_slot}
                  </p>
                  {res.admin_note && (
                    <p className="text-xs text-slate-500 dark:text-ink-mid mt-1 italic">Nota: {res.admin_note}</p>
                  )}
                </div>
              </div>
              {isPending && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.07] space-y-2">
                  <input
                    type="text"
                    value={noteInputs[res.id] || ''}
                    onChange={e => setNoteInputs(prev => ({ ...prev, [res.id]: e.target.value }))}
                    placeholder="Nota opcional para el propietario..."
                    className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleAction(res, 'rejected')}
                      disabled={saving === res.id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-400/[0.14] text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
                    >
                      {saving === res.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                      Rechazar
                    </button>
                    <button
                      onClick={() => handleAction(res, 'approved')}
                      disabled={saving === res.id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
                    >
                      {saving === res.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Aprobar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
