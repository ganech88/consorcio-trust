import { useState, useEffect, useRef } from 'react';
import { Megaphone, AlertTriangle, Info, Calendar, Pin, Loader2, CheckCheck } from 'lucide-react';
import { fetchAnnouncements, markAnnouncementRead, fetchMyAnnouncementReads } from '../services/data.service';
import { useData } from '../context/DataContext';

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

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function isNew(dateStr) {
  return Date.now() - new Date(dateStr).getTime() < SEVEN_DAYS_MS;
}

function AnnouncementCard({ announcement, isRead, onRead }) {
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef(null);
  const config = TYPE_CONFIG[announcement.type] || TYPE_CONFIG.info;
  const Icon = config.icon;
  const newItem = isNew(announcement.created_at);

  // Marcar como leído cuando la card entra en el viewport
  useEffect(() => {
    if (isRead) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onRead(announcement.id);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [announcement.id, isRead, onRead]);

  const formattedDate = new Date(announcement.created_at).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      ref={cardRef}
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
              {newItem && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                  Nuevo
                </span>
              )}
              {isRead && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500">
                  <CheckCheck size={10} /> Leído
                </span>
              )}
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
  const { userProfile } = useData();
  const [announcements, setAnnouncements] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userProfile?.consortium_id) return;

    Promise.all([
      fetchAnnouncements(userProfile.consortium_id),
      fetchMyAnnouncementReads(userProfile.id),
    ])
      .then(([ann, reads]) => {
        setAnnouncements(ann);
        setReadIds(new Set(reads));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, userProfile?.id]);

  function handleRead(announcementId) {
    if (readIds.has(announcementId)) return;
    setReadIds(prev => new Set([...prev, announcementId]));
    markAnnouncementRead(announcementId, userProfile.id);
  }

  const pinned = announcements.filter(a => a.pinned);
  const rest = announcements.filter(a => !a.pinned);
  const unreadCount = announcements.filter(a => !readIds.has(a.id)).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 rounded-2xl text-white shadow-lg shadow-orange-500/20">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Megaphone size={24} />
          Novedades del Consorcio
        </h3>
        <div className="flex items-center justify-between mt-1">
          <p className="text-amber-100 text-sm">Anuncios importantes y comunicados de la administración</p>
          {!loading && unreadCount > 0 && (
            <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {unreadCount} sin leer
            </span>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 size={32} className="animate-spin text-amber-500" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5 text-center">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && announcements.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center">
          <Megaphone size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">No hay comunicados publicados aún.</p>
        </div>
      )}

      {!loading && pinned.length > 0 && (
        <div className="space-y-4">
          {pinned.map(a => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              isRead={readIds.has(a.id)}
              onRead={handleRead}
            />
          ))}
        </div>
      )}

      {!loading && rest.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
            {pinned.length > 0 ? 'Anteriores' : 'Comunicados'}
          </h4>
          {rest.map(a => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              isRead={readIds.has(a.id)}
              onRead={handleRead}
            />
          ))}
        </div>
      )}
    </div>
  );
}
