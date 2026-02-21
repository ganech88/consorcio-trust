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
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-2xl text-white shadow-lg shadow-blue-500/20">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Calendar size={24} />
          Reserva de Amenities
        </h3>
        <p className="text-blue-100 mt-1 text-sm">Selecciona un espacio para reservar tu turno</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {AMENITIES_LIST.map((amenity) => (
          <div
            key={amenity.id}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all group cursor-pointer"
            onClick={() => handleReserve(amenity)}
          >
            {/* Icon area */}
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 h-36 rounded-xl mb-4 flex items-center justify-center text-5xl group-hover:from-blue-50 group-hover:to-indigo-50 transition-colors">
              {amenity.icon}
            </div>

            {/* Info */}
            <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
              {amenity.name}
            </h3>
            <p className="text-sm text-slate-500 mt-1.5">{amenity.description}</p>

            {/* Meta */}
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Users size={14} />
                {amenity.capacity} personas
              </span>
              <span className="flex items-center gap-1">
                <Clock size={14} />
                Turnos disponibles
              </span>
            </div>

            {/* Action */}
            <button className="mt-4 w-full border-2 border-blue-100 text-blue-600 font-semibold py-2.5 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all flex items-center justify-center gap-2 group-hover:border-blue-300">
              Reservar Turno
              <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
