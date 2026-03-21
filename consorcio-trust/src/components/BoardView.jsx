import { useState, useEffect, useCallback } from 'react';
import { LayoutList, Plus, X, Heart, Trash2, Loader2, Tag } from 'lucide-react';
import { fetchBoardPosts, createBoardPost, deleteBoardPost, reactBoardPost } from '../services/data.service';
import { useToast } from './Toast';
import Modal from './Modal';

const CATEGORIES = ['Venta', 'Búsqueda', 'Perdido/Encontrado', 'Servicios', 'Donación', 'Otro'];

const CATEGORY_COLORS = {
  'Venta':             'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'Búsqueda':          'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
  'Perdido/Encontrado':'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'Servicios':         'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  'Donación':          'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  'Otro':              'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)  return 'ahora mismo';
  if (mins < 60) return `hace ${mins}m`;
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${days}d`;
}

export default function BoardView({ session, userProfile }) {
  const toast = useToast();
  const isAdmin = userProfile?.role === 'admin';

  const [posts, setPosts]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('all');
  const [showModal, setShowModal]   = useState(false);
  const [deleting, setDeleting]     = useState(null);
  const [reacting, setReacting]     = useState(null);
  const [form, setForm]             = useState({ title: '', body: '', category: 'Otro' });
  const [saving, setSaving]         = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBoardPosts(userProfile?.consortium_id);
      setPosts(data);
    } catch (e) {
      toast.error(e.message, 'Error al cargar el tablón');
    } finally {
      setLoading(false);
    }
  }, [userProfile?.consortium_id, toast]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('El título es obligatorio'); return; }
    setSaving(true);
    try {
      const post = await createBoardPost({
        consortiumId: userProfile?.consortium_id,
        userId: session.user.id,
        title: form.title.trim(),
        body: form.body.trim() || null,
        category: form.category,
      });
      setPosts(prev => [post, ...prev]);
      setForm({ title: '', body: '', category: 'Otro' });
      setShowModal(false);
      toast.success('Publicación creada');
    } catch (e) {
      toast.error(e.message, 'Error al publicar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await deleteBoardPost(id);
      setPosts(prev => prev.filter(p => p.id !== id));
      toast.success('Publicación eliminada');
    } catch (e) {
      toast.error(e.message, 'Error al eliminar');
    } finally {
      setDeleting(null);
    }
  }

  async function handleReact(post) {
    setReacting(post.id);
    // Optimistic update
    setPosts(prev => prev.map(p =>
      p.id === post.id ? { ...p, reactions_count: (p.reactions_count || 0) + 1 } : p
    ));
    try {
      await reactBoardPost(post.id);
    } catch (e) {
      // Revert
      setPosts(prev => prev.map(p =>
        p.id === post.id ? { ...p, reactions_count: Math.max(0, (p.reactions_count || 1) - 1) } : p
      ));
      toast.error('No se pudo registrar la reacción');
    } finally {
      setReacting(null);
    }
  }

  const filtered = filter === 'all' ? posts : posts.filter(p => p.category === filter);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-700 p-6 rounded-2xl text-white shadow-lg shadow-brand-500/20 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2 mb-1">
            <LayoutList size={24} />
            Tablón de la Comunidad
          </h3>
          <p className="text-brand-100 text-sm">Compartí avisos con tus vecinos</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shrink-0"
        >
          <Plus size={18} />
          Nueva publicación
        </button>
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            filter === 'all'
              ? 'bg-brand-600 text-white'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          Todos ({posts.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = posts.filter(p => p.category === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                filter === cat
                  ? 'bg-brand-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Posts feed */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center text-slate-400 dark:text-slate-500">
          <LayoutList size={44} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay publicaciones</p>
          <p className="text-sm mt-1">Sé el primero en publicar algo</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(post => {
            const catColor = CATEGORY_COLORS[post.category] || CATEGORY_COLORS['Otro'];
            const isOwner = post.user_id === session.user.id;
            const unitNum = post.unit_id || '—';
            return (
              <div
                key={post.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${catColor}`}>
                      {post.category}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">Unidad {unitNum}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">· {relativeTime(post.created_at)}</span>
                  </div>
                  {(isOwner || isAdmin) && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      disabled={deleting === post.id}
                      className="p-1.5 text-slate-300 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0"
                    >
                      {deleting === post.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Trash2 size={14} />
                      }
                    </button>
                  )}
                </div>

                <h4 className="font-bold text-slate-800 dark:text-slate-100 mt-3 text-base">{post.title}</h4>
                {post.body && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">{post.body}</p>
                )}

                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => handleReact(post)}
                    disabled={reacting === post.id}
                    className="flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 hover:text-pink-500 dark:hover:text-pink-400 transition-colors"
                  >
                    <Heart size={16} className={reacting === post.id ? 'fill-pink-500 text-pink-500' : ''} />
                    <span className="font-medium">{post.reactions_count || 0}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New post modal */}
      {showModal && (
        <Modal title="Nueva publicación" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Categoría
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, category: cat }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      form.category === cat
                        ? 'bg-brand-600 border-brand-600 text-white'
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-brand-300'
                    }`}
                  >
                    <Tag size={11} />
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ej: Vendo bicicleta — excelente estado"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
                required
                maxLength={120}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Detalle (opcional)
              </label>
              <textarea
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Agregá más información sobre tu publicación..."
                rows={3}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-brand-600 to-brand-700 text-white py-3 rounded-xl font-bold hover:from-brand-700 hover:to-brand-800 flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {saving ? 'Publicando...' : 'Publicar'}
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
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
