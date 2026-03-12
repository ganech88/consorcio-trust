import { Calendar, Users, Clock, ChevronRight } from 'lucide-react';
import { AMENITIES_LIST } from '../lib/constants';
import { useToast } from './Toast';

export default function AmenitiesView() {
  const toast = useToast();

  function handleReserve(amenity) {
    toast.info(`Reserva de "${amenity.name}" próximamente disponible`, 'Función en desarrollo');
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-2xl text-white shadow-lg shadow-blue-500/20">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Calendar size={24} />
          Reserva de Amenities
        </h3>
        <p className="text-blue-100 mt-1 text-sm">Selecciona un espacio para reservar tu turno</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {AMENITIES_LIST.map((amenity) => (
          <div
            key={amenity.id}
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-600 hover:shadow-md transition-all group cursor-pointer"
            onClick={() => handleReserve(amenity)}
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
    </div>
  );
}
