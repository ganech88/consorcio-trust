import { useState, useEffect, useCallback } from 'react';
import { FileText, ChevronDown, ChevronUp, Check, X, Clock, Loader2, Trash2 } from 'lucide-react';
import { fetchDocuments, updateDocumentStatus, deleteDocument } from '../../services/data.service';
import { useToast } from '../Toast';
import { DOC_TYPES_MAP, DOC_STATUS, LoadingSpinner, EmptyState } from './shared';
import Pagination from './Pagination';

export default function DocumentsTab({ session, userProfile }) {
  const toast = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(null);
  const [noteInputs, setNoteInputs] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [, setPage] = useState(0);
  const [pagination, setPagination] = useState(null);

  const loadPage = useCallback((p) => {
    setLoading(true);
    fetchDocuments(userProfile?.consortium_id, null, true, { page: p })
      .then(result => {
        setDocuments(result.data);
        setPagination(result);
        setPage(p);
      })
      .catch(e => toast.error(e.message, 'Error al cargar documentos'))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, toast]);

  useEffect(() => { loadPage(0); }, [loadPage]);

  async function handleStatus(doc, status) {
    setSaving(doc.id);
    try {
      const updated = await updateDocumentStatus(doc.id, status, noteInputs[doc.id] || null, session.user.id);
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, ...updated } : d));
      toast.success('Estado actualizado');
      setExpanded(null);
    } catch (e) {
      toast.error(e.message, 'Error al actualizar');
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete(doc) {
    try {
      await deleteDocument(doc.id);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      toast.success('Documento eliminado');
    } catch (e) {
      toast.error(e.message, 'Error al eliminar');
    }
  }

  const filtered = filter === 'all' ? documents : documents.filter(d => d.status === filter);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'under_review', 'approved', 'rejected'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === s
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-surface-panel text-slate-600 dark:text-ink-mid border border-slate-200 dark:border-white/[0.07] hover:bg-slate-50 dark:hover:bg-white/[0.06]'
            }`}
          >
            {s === 'all' ? 'Todos' : DOC_STATUS[s]?.label ?? s}
            {s !== 'all' && (
              <span className="ml-1.5 opacity-70">
                ({documents.filter(d => d.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} text="No hay documentos en esta categoría" />
      ) : (
        filtered.map(doc => {
          const isOpen = expanded === doc.id;
          const st = DOC_STATUS[doc.status] ?? DOC_STATUS.pending;
          const userName = doc.profiles?.full_name || 'Usuario';
          const unitId = doc.profiles?.unit_id || '—';

          return (
            <div key={doc.id} className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] overflow-hidden">
              <button
                onClick={() => {
                  setExpanded(isOpen ? null : doc.id);
                  if (!isOpen) setNoteInputs(prev => ({ ...prev, [doc.id]: doc.admin_notes || '' }));
                }}
                className="w-full p-4 flex items-start gap-3 text-left hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors"
              >
                <span className={`mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${st.color}`}>
                  {st.label}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-ink-hi truncate">{doc.title}</p>
                  <p className="text-xs text-slate-400 dark:text-ink-low mt-0.5">
                    {userName} · Unidad {unitId} · {new Date(doc.created_at).toLocaleDateString('es-AR')}
                  </p>
                  {doc.doc_type && doc.doc_type !== 'general' && (
                    <span className="text-[10px] bg-slate-100 dark:bg-surface-panel2 text-slate-500 dark:text-ink-mid px-1.5 py-0.5 rounded mt-1 inline-block">
                      {DOC_TYPES_MAP[doc.doc_type] ?? doc.doc_type}
                    </span>
                  )}
                </div>
                {isOpen ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-slate-100 dark:border-white/[0.07] pt-3 space-y-3">
                  {doc.description && (
                    <p className="text-sm text-slate-600 dark:text-ink-mid bg-slate-50 dark:bg-surface-inset rounded-xl p-3">
                      {doc.description}
                    </p>
                  )}
                  {doc.file_url && (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-brand-400 hover:underline"
                    >
                      <FileText size={13} /> Ver archivo adjunto
                    </a>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">
                      Nota para el residente <span className="font-normal">(opcional)</span>
                    </label>
                    <textarea
                      value={noteInputs[doc.id] ?? ''}
                      onChange={e => setNoteInputs(prev => ({ ...prev, [doc.id]: e.target.value }))}
                      rows={2}
                      placeholder="Mensaje al residente..."
                      className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleStatus(doc, 'under_review')}
                      disabled={saving === doc.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-brand-400/[0.14] text-blue-700 dark:text-brand-400 hover:bg-blue-100 transition-colors disabled:opacity-60"
                    >
                      <Clock size={13} /> En revisión
                    </button>
                    <button
                      onClick={() => handleStatus(doc, 'approved')}
                      disabled={saving === doc.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-400/[0.14] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-colors disabled:opacity-60"
                    >
                      {saving === doc.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      Aprobar
                    </button>
                    <button
                      onClick={() => handleStatus(doc, 'rejected')}
                      disabled={saving === doc.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-red-50 dark:bg-red-400/[0.14] text-red-700 dark:text-red-400 hover:bg-red-100 transition-colors disabled:opacity-60"
                    >
                      <X size={13} /> Rechazar
                    </button>
                    <button
                      onClick={() => handleDelete(doc)}
                      disabled={saving === doc.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-surface-panel2 text-slate-600 dark:text-ink-mid hover:bg-slate-200 transition-colors disabled:opacity-60"
                    >
                      <Trash2 size={13} /> Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
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
