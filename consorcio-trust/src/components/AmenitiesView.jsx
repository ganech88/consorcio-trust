import { useState, useEffect, useCallback } from 'react';
import { Calendar, Users, Clock, ChevronRight, X, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { AMENITIES_LIST } from '../lib/constants';
import { useToast } from './Toast';
import { fetchReservations, createReservation, cancelReservation } from '../services/data.service';
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
  pending: { label: 'Pendiente', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', icon: Clock },
  approved: { label: 'Aprobada', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', icon: CheckCircle },
  rejected: { label: 'Rechazada', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30', icon: AlertCircle },
};

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

export default function AmenitiesView({ session, userProfile }) {
  const [selectedAmenity, setSelectedAmenity] = useState(null);
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const toast = useToast();

  const loadReservations = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const data = await fetchReservations(session.user.id);
      setReservations(data);
    } catch (err) {
      toast.error('No se pudieron cargar las reservas', 'Error');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, toast]);

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
      if (newRes) setReservations((prev) => [newRes, ...prev]);
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

  async function handleCancel(reservationId) {
    setCancelling(reservationId);
    try {
      await cancelReservation(reservationId);
      setReservations((prev) => prev.filter((r) => r.id !== reservationId));
      toast.success('Reserva cancelada');
    } catch (err) {
      toast.error('No se pudo cancelar la reserva', 'Error');
    } finally {
      setCancelling(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-2xl text-white shadow-lg shadow-blue-500/20">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Calendar size={24} />
          Reserva de Amenities
        </h3>
        <p className="text-blue-100 mt-1 text-sm">Seleccioná un espacio para reservar tu turno</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {AMENITIES_LIST.map((amenity) => (
          <div
            key={amenity.id}
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-600 hover:shadow-md transition-all group cursor-pointer"
            onClick={() => { setSelectedAmenity(amenity); setDate(''); setTimeSlot(''); }}
          >
            <div className="bg-gradient-to-br from-slate-50 dark:from-slate-700 to-blue-50 dark:to-slate-700 h-36 rounded-xl mb-4 flex items-center justify-center text-5xl group-hover:from-blue-50 dark:group-hover:from-slate-600 group-hover:to-indigo-50 dark:group-hover:to-slate-600 transition-colors">
              {amenity.icon}
            </div>

            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
              {amenity.name}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">{amenity.description}</p>

            <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1">
                <Users size={14} />
                {amenity.capacity} personas
              </span>
              <span className="flex items-center gap-1">
                <Clock size={14} />
                Turnos disponibles
              </span>
            </div>

            <button className="mt-4 w-full border-2 border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-400 font-semibold py-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 transition-all flex items-center justify-center gap-2 group-hover:border-blue-300 dark:group-hover:border-blue-700">
              Reservar Turno
              <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        ))}
      </div>

      {/* Mis reservas */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
          <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Calendar size={18} className="text-blue-600 dark:text-blue-400" />
            Mis Reservas
          </h4>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm">Cargando reservas...</p>
          </div>
        ) : reservations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500">
            <Calendar size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No tenés reservas activas</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {reservations.map((res) => {
              const sc = STATUS_CONFIG[res.status] || STATUS_CONFIG.pending;
              const StatusIcon = sc.icon;
              return (
                <div key={res.id} className="p-4 flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${sc.bg} shrink-0`}>
                    <StatusIcon size={16} className={sc.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{res.amenity_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {formatDate(res.date)} · {res.time_slot}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sc.bg} ${sc.color}`}>
                    {sc.label}
                  </span>
                  {res.status === 'pending' && (
                    <button
                      onClick={() => handleCancel(res.id)}
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
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 flex items-center gap-3">
              <span className="text-3xl">{selectedAmenity.icon}</span>
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-100">{selectedAmenity.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{selectedAmenity.description}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Fecha <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                min={getTodayString()}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-slate-700 dark:text-slate-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Horario <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setTimeSlot(slot)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      timeSlot === slot
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting || !date || !timeSlot}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="px-4 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
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
