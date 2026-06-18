import { useState, useEffect } from 'react';
import { Plus, FileText, Loader2, X } from 'lucide-react';
import { fetchDocuments, createDocument, deleteDocument } from '../services/data.service';
import { useToast } from './Toast';

const DOC_TYPES = [
  { value: 'general',   label: 'General' },
  { value: 'identity',  label: 'Identidad' },
  { value: 'ownership', label: 'Propiedad' },
  { value: 'request',   label: 'Solicitud' },
  { value: 'complaint', label: 'Reclamo' },
  { value: 'other',     label: 'Otro' },
];

const STATUS_CONFIG = {
  pending:      { label: 'Pendiente',   badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  approved:     { label: 'Aprobado',    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  rejected:     { label: 'Rechazado',   badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
  under_review: { label: 'En revisión', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-brand-400' },
};

const EMPTY_FORM = { title: '', description: '', doc_type: 'general', file_url: '', file_name: '' };

export default function DocumentsView({ session, userProfile }) {
  const toast = useToast();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'owner';

  useEffect(() => {
    if (!userProfile?.consortium_id) return;
    fetchDocuments(userProfile.consortium_id, session.user.id, isAdmin)
      .then(setDocs)
      .catch(e => toast.error(e.message, 'Error al cargar documentos'))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, session.user.id, isAdmin, toast]);

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Ingresá un título'); return; }
    setSaving(true);
    try {
      const doc = await createDocument(
        userProfile.consortium_id,
        session.user.id,
        {
          title: form.title.trim(),
          description: form.description.trim() || null,
          doc_type: form.doc_type,
          file_url: form.file_url.trim() || null,
          file_name: form.file_name.trim() || null,
        }
      );
      setDocs(prev => [doc, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast.success('Documento enviado para revisión');
    } catch (e) {
      toast.error(e.message, 'Error al enviar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await deleteDocument(id);
      setDocs(prev => prev.filter(d => d.id !== id));
      toast.success('Documento eliminado');
    } catch (e) {
      toast.error(e.message, 'Error al eliminar');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white dark:bg-surface-panel p-5 rounded-2xl border border-slate-100 dark:border-white/[0.07] flex items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg text-slate-800 dark:text-ink-hi flex items-center gap-2">
            <FileText size={20} className="text-brand-600 dark:text-brand-400" />
            Mis Documentos
          </h3>
          <p className="text-sm text-slate-500 dark:text-ink-mid mt-0.5">
            Enviá documentos para revisión del administrador
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shrink-0"
        >
          <Plus size={16} />
          Subir documento
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-panel rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/[0.07]">
              <h4 className="font-bold text-slate-800 dark:text-ink-hi">Subir documento</h4>
              <button
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">
                  Título *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setField('title', e.target.value)}
                  placeholder="Ej: DNI frente y dorso"
                  className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">
                  Tipo
                </label>
                <select
                  value={form.doc_type}
                  onChange={e => setField('doc_type', e.target.value)}
                  className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">
                  Descripción
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  placeholder="Información adicional..."
                  rows={2}
                  className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">
                  URL del archivo <span className="font-normal text-slate-400">(opcional)</span>
                </label>
                <input
                  type="url"
                  value={form.file_url}
                  onChange={e => setField('file_url', e.target.value)}
                  placeholder="https://..."
                  className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                  className="flex-1 border border-slate-200 dark:border-white/[0.09] text-slate-600 dark:text-ink-mid py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={32} className="animate-spin text-brand-500" />
        </div>
      ) : docs.length === 0 ? (
        <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-16 text-center">
          <FileText size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <h4 className="font-semibold text-slate-600 dark:text-ink-mid">No tenés documentos subidos</h4>
          <p className="text-slate-400 dark:text-ink-low text-sm mt-1">
            Usá el botón para enviar un documento a revisión
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map(doc => {
            const st = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.pending;
            const docTypeLabel = DOC_TYPES.find(t => t.value === doc.doc_type)?.label ?? doc.doc_type;
            return (
              <div
                key={doc.id}
                className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-brand-50 dark:bg-brand-400/[0.14] p-2.5 rounded-xl shrink-0">
                    <FileText size={18} className="text-brand-600 dark:text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 dark:text-ink-hi text-sm">{doc.title}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${st.badge}`}>
                        {st.label}
                      </span>
                    </div>
                    {doc.description && (
                      <p className="text-xs text-slate-500 dark:text-ink-mid mt-0.5">{doc.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] bg-slate-100 dark:bg-surface-panel2 text-slate-500 dark:text-ink-mid px-1.5 py-0.5 rounded">
                        {docTypeLabel}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-ink-low">
                        {new Date(doc.created_at).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                    {doc.admin_notes && (
                      <div className="mt-2 bg-slate-50 dark:bg-surface-inset rounded-xl p-3">
                        <p className="text-[10px] font-semibold text-slate-400 dark:text-ink-low uppercase tracking-wider mb-0.5">
                          Nota del administrador
                        </p>
                        <p className="text-sm text-slate-700 dark:text-ink-mid">{doc.admin_notes}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {doc.file_url && (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-white/[0.06] transition-colors"
                        title="Ver archivo"
                      >
                        <FileText size={15} />
                      </a>
                    )}
                    {doc.user_id === session.user.id && (
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={deleting === doc.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60"
                        title="Eliminar"
                      >
                        {deleting === doc.id
                          ? <Loader2 size={15} className="animate-spin" />
                          : <X size={15} />
                        }
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
