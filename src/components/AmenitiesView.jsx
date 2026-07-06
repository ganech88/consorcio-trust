import { useState, useEffect, useCallback } from 'react';
import { Calendar, Users, Clock, ChevronRight, X, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { AMENITIES_LIST } from '../lib/constants';
import { useToast } from './Toast';
import { fetchReservations, createReservation, cancelReservation, fetchConsortiumReservations } from '../services/data.service';
import { formatDate } from '../lib/utils';
import Modal from './Modal';

const TIME_SLOTS = [
  '08:00 - 10:00',
  '10:00 - 12:00',
  '12:00 - 14:00',
  '14:00 - 16:00',
  '16:00 - 18:00',
  '18:00 - 20:00',
  '20:00 - 22:00',
];

const STATUS_CONFIG = {
  pending:  { label: 'Pendiente', color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-400/[0.14]',   icon: Clock },
  approved: { label: 'Aprobada',  color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-400/[0.14]', icon: CheckCircle },
  rejected: { label: 'Rechazada', color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-400/[0.14]',       icon: AlertCircle },
};

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

function getAvailabilityInfo(amenityId, allReservations) {
  const todayStr = getTodayString();
  // pending y approved bloquean el turno (UNIQUE parcial en la DB)
  const todayRes = allReservations.filter(
    r => r.amenity_id === amenityId && r.date === todayStr && ['pending', 'approved'].includes(r.status)
  );
  const takenSlots = todayRes.map(r => r.time_slot);
  const freeSlots = TIME_SLOTS.filter(s => !takenSlots.includes(s));

  if (freeSlots.length === 0) {
    return { label: 'Ocupado', badgeBg: 'bg-slate-500', nextSlot: null };
  }
  if (freeSlots.length === 1) {
    return { label: 'Último turno', badgeBg: 'bg-amber-500', nextSlot: freeSlots[0] };
  }
  return { label: 'Disponible', badgeBg: 'bg-emerald-500', nextSlot: freeSlots[0] };
}

export default function AmenitiesView({ session, userProfile }) {
  const [selectedAmenity, setSelectedAmenity] = useState(null);
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [reservations, setReservations] = useState([]);
  const [allReservations, setAllReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const toast = useToast();

  const loadReservations = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const [mine, all] = await Promise.all([
        fetchReservations(session.user.id),
        fetchConsortiumReservations(userProfile?.consortium_id).catch(() => []),
      ]);
      setReservations(mine);
      setAllReservations(all);
    } catch (err) {
      toast.error('No se pudieron cargar las reservas', 'Error');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, userProfile?.consortium_id, toast]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!date || !timeSlot) {
      toast.error('Seleccioná una fecha y un horario');
      return;
    }

    setSubmitting(true);
    try {
      const newRes = await createReservation({
        amenityId: selectedAmenity.id,
        amenityName: selectedAmenity.name,
        date,
        timeSlot,
        userId: session.user.id,
        consortiumId: userProfile?.consortium_id ?? null,
      });
      if (newRes) {
        setReservations((prev) => [newRes, ...prev]);
        setAllReservations((prev) => [newRes, ...prev]);
      }
      toast.success(`Reserva de "${selectedAmenity.name}" enviada. El administrador la revisará.`);
      setSelectedAmenity(null);
      setDate('');
      setTimeSlot('');
    } catch (err) {
      toast.error(err.message || 'No se pudo crear la reserva', 'Error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(res) {
    if (res.status === 'approved' && !window.confirm('Vas a liberar el turno. ¿Querés cancelar la reserva?')) {
      return;
    }
    setCancelling(res.id);
    try {
      await cancelReservation(res.id);
      setReservations((prev) => prev.filter((r) => r.id !== res.id));
      setAllReservations((prev) => prev.filter((r) => r.id !== res.id));
      toast.success('Reserva cancelada');
    } catch (err) {
      toast.error('No se pudo cancelar la reserva', 'Error');
    } finally {
      setCancelling(null);
    }
  }

  const takenForSelected = selectedAmenity && date
    ? allReservations
        .filter((r) => r.amenity_id === selectedAmenity.id && r.date === date && ['pending', 'approved'].includes(r.status))
        .map((r) => r.time_slot)
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-brand-600 p-6 rounded-2xl text-white shadow-lg shadow-brand-500/20">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Calendar size={24} />
          Reserva de Amenities
        </h3>
        <p className="text-brand-100 mt-1 text-sm">Seleccioná un espacio para reservar tu turno</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {AMENITIES_LIST.map((amenity) => {
          const avail = getAvailabilityInfo(amenity.id, allReservations);
          return (
            <div
              key={amenity.id}
              className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] hover:border-brand-200 dark:hover:border-brand-600 transition-all group cursor-pointer overflow-hidden"
              onClick={() => { setSelectedAmenity(amenity); setDate(''); setTimeSlot(''); }}
            >
              {/* Image with availability badge */}
              <div className="relative h-40 overflow-hidden">
                <img
                  src={amenity.imageUrl}
                  alt={amenity.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                {/* Availability badge */}
                <span className={`absolute top-3 right-3 ${avail.badgeBg} text-white text-xs font-bold px-2.5 py-1 rounded-full shadow`}>
                  {avail.label}
                </span>
              </div>

              <div className="p-5">
                <h3 className="text-lg font-bold text-slate-800 dark:text-ink-hi group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">
                  {amenity.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-ink-mid mt-1">{amenity.description}</p>

                <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 dark:text-ink-low">
                  <span className="flex items-center gap-1">
                    <Users size={14} />
                    {amenity.capacity} personas
                  </span>
                  {avail.nextSlot && (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <Clock size={14} />
                      Próx. libre: {avail.nextSlot.split(' - ')[0]}
                    </span>
                  )}
                </div>

                <button className="mt-4 w-full border-2 border-brand-100 dark:border-brand-900 text-brand-600 dark:text-brand-400 font-semibold py-2.5 rounded-xl hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:border-brand-200 dark:hover:border-brand-800 transition-all flex items-center justify-center gap-2">
                  Reservar Turno
                  <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mis reservas */}
      <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-white/[0.07]">
          <h4 className="font-bold text-slate-800 dark:text-ink-hi flex items-center gap-2">
            <Calendar size={18} className="text-brand-600 dark:text-brand-400" />
            Mis Reservas
          </h4>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 dark:text-ink-low">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm">Cargando reservas...</p>
          </div>
        ) : reservations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-ink-low">
            <Calendar size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No tenés reservas activas</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-white/[0.06]">
            {reservations.map((res) => {
              const sc = STATUS_CONFIG[res.status] || STATUS_CONFIG.pending;
              const StatusIcon = sc.icon;
              return (
                <div key={res.id} className="p-4 flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${sc.bg} shrink-0`}>
                    <StatusIcon size={16} className={sc.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-ink-hi text-sm">{res.amenity_name}</p>
                    <p className="text-xs text-slate-500 dark:text-ink-mid mt-0.5">
                      {formatDate(res.date)} · {res.time_slot}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sc.bg} ${sc.color}`}>
                    {sc.label}
                  </span>
                  {['pending', 'approved'].includes(res.status) && (
                    <button
                      onClick={() => handleCancel(res)}
                      disabled={cancelling === res.id}
                      className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                      aria-label="Cancelar reserva"
                    >
                      {cancelling === res.id ? (
                        <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de reserva */}
      {selectedAmenity && (
        <Modal title={`Reservar ${selectedAmenity.name}`} onClose={() => setSelectedAmenity(null)}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-slate-50 dark:bg-surface-inset rounded-xl p-4 flex items-center gap-3">
              <span className="text-3xl">{selectedAmenity.icon}</span>
              <div>
                <p className="font-bold text-slate-800 dark:text-ink-hi">{selectedAmenity.name}</p>
                <p className="text-xs text-slate-500 dark:text-ink-mid">{selectedAmenity.description}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-ink-mid mb-1.5">
                Fecha <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                min={getTodayString()}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full p-3 border border-slate-200 dark:border-white/[0.09] rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white dark:bg-surface-panel2 dark:text-ink-hi transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-ink-mid mb-1.5">
                Horario <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TIME_SLOTS.map((slot) => {
                  const taken = takenForSelected.includes(slot);
                  return (
                  <button
                    key={slot}
                    type="button"
                    disabled={taken}
                    onClick={() => setTimeSlot(slot)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      taken
                        ? 'border-slate-200 dark:border-white/[0.09] text-slate-300 dark:text-ink-low line-through opacity-50 cursor-not-allowed'
                        : timeSlot === slot
                        ? 'bg-brand-600 border-brand-600 text-white'
                        : 'border-slate-200 dark:border-white/[0.09] text-slate-600 dark:text-ink-mid hover:border-brand-300 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20'
                    }`}
                  >
                    {slot}{taken ? ' · Ocupado' : ''}
                  </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting || !date || !timeSlot}
                className="flex-1 bg-brand-600 text-white py-3 rounded-xl font-bold hover:from-brand-700 hover:to-brand-800 flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                {submitting ? 'Enviando...' : 'Confirmar Reserva'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedAmenity(null)}
                className="px-4 border border-slate-200 dark:border-white/[0.09] text-slate-600 dark:text-ink-mid rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-colors flex items-center gap-2"
              >
                <X size={16} /> Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
