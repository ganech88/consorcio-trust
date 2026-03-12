import { useState } from 'react';
import { Megaphone, AlertTriangle, Info, Calendar, Pin } from 'lucide-react';

const MOCK_ANNOUNCEMENTS = [
  {
    id: 1,
    title: 'Corte de agua programado',
    body: 'El martes 18/02 de 9hs a 14hs se realizará un corte de agua por mantenimiento de tanques. Recomendamos almacenar agua con anticipación.',
    type: 'urgent',
    date: '2026-02-14',
    pinned: true,
  },
  {
    id: 2,
    title: 'Asamblea Ordinaria',
    body: 'Se convoca a asamblea ordinaria el día sábado 22/02 a las 18hs en el SUM. Orden del día: aprobación de balance, elección de consejo, varios.',
    type: 'event',
    date: '2026-02-12',
    pinned: true,
  },
  {
    id: 3,
    title: 'Fumigación de espacios comunes',
    body: 'El viernes 21/02 se realizará fumigación preventiva en pasillos, cocheras y áreas verdes. Se solicita mantener mascotas dentro de las unidades.',
    type: 'info',
    date: '2026-02-10',
    pinned: false,
  },
  {
    id: 4,
    title: 'Nuevo horario de gimnasio',
    body: 'A partir de marzo, el gimnasio estará disponible de 7hs a 22hs (antes cerraba a las 21hs). Se incorporaron equipos nuevos de cardio.',
    type: 'info',
    date: '2026-02-05',
    pinned: false,
  },
  {
    id: 5,
    title: 'Recordatorio: Expensas Febrero',
    body: 'Les recordamos que el vencimiento de expensas de febrero es el 10/03/2026. Pueden informar el pago desde la app o por WhatsApp.',
    type: 'info',
    date: '2026-02-01',
    pinned: false,
  },
];

const TYPE_CONFIG = {
  urgent: {
    icon: AlertTriangle,
    bg: 'bg-red-50 dark:bg-red-900/30',
    border: 'border-red-200 dark:border-red-800',
    iconColor: 'text-red-500 dark:text-red-400',
    badge: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
    label: 'Urgente',
  },
  event: {
    icon: Calendar,
    bg: 'bg-purple-50 dark:bg-purple-900/30',
    border: 'border-purple-200 dark:border-purple-800',
    iconColor: 'text-purple-500 dark:text-purple-400',
    badge: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
    label: 'Evento',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-500 dark:text-blue-400',
    badge: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
    label: 'Informativo',
  },
};

function AnnouncementCard({ announcement }) {
  const [expanded, setExpanded] = useState(false);
  const config = TYPE_CONFIG[announcement.type] || TYPE_CONFIG.info;
  const Icon = config.icon;

  const formattedDate = new Date(announcement.date + 'T12:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
  });

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${
        announcement.pinned ? config.border : 'border-slate-100 dark:border-slate-700'
      }`}
    >
      {announcement.pinned && (
        <div className={`${config.bg} px-4 py-1.5 flex items-center gap-1.5 text-xs font-semibold ${config.iconColor}`}>
          <Pin size={12} />
          Fijado
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl ${config.bg} shrink-0`}>
            <Icon size={20} className={config.iconColor} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-slate-800 dark:text-slate-100">{announcement.title}</h4>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.badge}`}>
                {config.label}
              </span>
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{formattedDate}</p>

            <p className={`text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed ${!expanded && 'line-clamp-2'}`}>
              {announcement.body}
            </p>

            {announcement.body.length > 100 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1.5 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                {expanded ? 'Ver menos' : 'Ver más...'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnnouncementsView() {
  const pinned = MOCK_ANNOUNCEMENTS.filter((a) => a.pinned);
  const rest = MOCK_ANNOUNCEMENTS.filter((a) => !a.pinned);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 rounded-2xl text-white shadow-lg shadow-orange-500/20">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Megaphone size={24} />
          Novedades del Consorcio
        </h3>
        <p className="text-amber-100 mt-1 text-sm">Anuncios importantes y comunicados de la administración</p>
      </div>

      {pinned.length > 0 && (
        <div className="space-y-4">
          {pinned.map((a) => (
            <AnnouncementCard key={a.id} announcement={a} />
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">Anteriores</h4>
          {rest.map((a) => (
            <AnnouncementCard key={a.id} announcement={a} />
          ))}
        </div>
      )}
    </div>
  );
}
