import { useState, useEffect, useCallback } from 'react';
import { Megaphone, Pin, Loader2, Trash2 } from 'lucide-react';
import { fetchAnnouncements, createAnnouncement, deleteAnnouncement } from '../../services/data.service';
import { useToast } from '../Toast';
import { LoadingSpinner, EmptyState } from './shared';
import Pagination from './Pagination';

export default function AnnouncementsTab({ session, userProfile }) {
  const toast = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState({ title: '', body: '', type: 'info', pinned: false });
  const [page, setPage] = useState(0);
  const [pagination, setPagination] = useState(null);

  function setField(k, v) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  const loadPage = useCallback((p) => {
    setLoading(true);
    fetchAnnouncements(userProfile?.consortium_id, { page: p })
      .then(result => {
        setAnnouncements(result.data);
        setPagination(result);
        setPage(p);
      })
      .catch(e => toast.error(e.message, 'Error al cargar comunicados'))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, toast]);

  useEffect(() => { loadPage(0); }, [loadPage]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Completá título y contenido');
      return;
    }
    setSaving(true);
    try {
      const created = await createAnnouncement({
        title: form.title.trim(),
        body: form.body.trim(),
        type: form.type,
        pinned: form.pinned,
        consortiumId: userProfile?.consortium_id,
        createdBy: session.user.id,
      });
      if (created) {
        setAnnouncements(prev => [created, ...prev]);
      }
      toast.success('Comunicado publicado');
      setForm({ title: '', body: '', type: 'info', pinned: false });
    } catch (e) {
      toast.error(e.message, 'Error al publicar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await deleteAnnouncement(id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      toast.success('Comunicado eliminado');
    } catch (e) {
      toast.error(e.message, 'Error al eliminar');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm space-y-4">
        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Publicar nuevo comunicado</h4>
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Título</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setField('title', e.target.value)}
            placeholder="Título del comunicado"
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Contenido</label>
          <textarea
            value={form.body}
            onChange={e => setField('body', e.target.value)}
            placeholder="Redactá el comunicado..."
            rows={4}
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Categoría</label>
            <select
              value={form.type}
              onChange={e => setField('type', e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="info">Informativo</option>
              <option value="event">Evento</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer select-none pb-2.5">
              <div
                onClick={() => setField('pinned', !form.pinned)}
                className={`w-10 h-5 rounded-full transition-colors relative ${form.pinned ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.pinned ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <Pin size={13} /> Fijar
              </span>
            </label>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />}
          Publicar Comunicado
        </button>
      </form>

      {/* Lista */}
      {loading ? <LoadingSpinner /> : (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
            Comunicados publicados ({announcements.length})
          </h4>
          {announcements.length === 0 ? (
            <EmptyState icon={Megaphone} text="No hay comunicados publicados aún" />
          ) : (
            announcements.map(a => (
              <div key={a.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{a.title}</p>
                    {a.pinned && <Pin size={13} className="text-amber-500" />}
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      a.type === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                      a.type === 'event' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    }`}>
                      {a.type === 'urgent' ? 'Urgente' : a.type === 'event' ? 'Evento' : 'Info'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {new Date(a.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2">{a.body}</p>
                </div>
                <button
                  onClick={() => handleDelete(a.id)}
                  disabled={deleting === a.id}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0 disabled:opacity-60"
                  title="Eliminar"
                >
                  {deleting === a.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.pageSize}
          onPageChange={loadPage}
        />
      )}
    </div>
  );
}
