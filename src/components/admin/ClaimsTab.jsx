import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Check, Loader2 } from 'lucide-react';
import { fetchAllClaims, updateClaimStatus } from '../../services/data.service';
import { useToast } from '../Toast';
import { STATUS_LABELS, LoadingSpinner, EmptyState } from './shared';
import Pagination from './Pagination';
import { PAGE_SIZE } from '../../lib/pagination';

export default function ClaimsTab({ session }) {
  const toast = useToast();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(null);
  const [noteInputs, setNoteInputs] = useState({});
  const [statusInputs, setStatusInputs] = useState({});
  const [, setPage] = useState(0);
  const [pagination, setPagination] = useState(null);

  const loadPage = useCallback((p) => {
    setLoading(true);
    fetchAllClaims({ page: p })
      .then(result => {
        setClaims(result.data);
        setPagination(result);
        setPage(p);
      })
      .catch((e) => toast.error(e.message, 'Error al cargar reclamos'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { loadPage(0); }, [loadPage]);

  async function handleSave(claim) {
    const status = statusInputs[claim.id] ?? claim.status;
    const adminNote = noteInputs[claim.id] ?? claim.admin_note ?? '';
    setSaving(claim.id);
    try {
      const updated = await updateClaimStatus(claim.id, status, adminNote, session.user.id);
      setClaims(prev => prev.map(c => c.id === claim.id ? { ...c, ...updated, profiles: c.profiles } : c));
      toast.success('Reclamo actualizado');
      setExpanded(null);
    } catch (e) {
      toast.error(e.message, 'Error al guardar');
    } finally {
      setSaving(null);
    }
  }

  const filtered = filter === 'all' ? claims : claims.filter(c => c.status === filter);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {['all', 'open', 'pending', 'closed'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === s
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {s === 'all' ? 'Todos' : STATUS_LABELS[s]?.label ?? s}
            {s !== 'all' && (
              <span className="ml-1.5 opacity-70">
                ({claims.filter(c => c.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={AlertCircle} text="No hay reclamos en esta categoría" />
      ) : (
        filtered.map(claim => {
          const isOpen = expanded === claim.id;
          const st = STATUS_LABELS[claim.status] || STATUS_LABELS.open;
          const userName = claim.profiles?.full_name || 'Usuario';
          const unitId = claim.profiles?.unit_id || '—';

          return (
            <div key={claim.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <button
                onClick={() => {
                  setExpanded(isOpen ? null : claim.id);
                  if (!isOpen) {
                    setStatusInputs(prev => ({ ...prev, [claim.id]: claim.status }));
                    setNoteInputs(prev => ({ ...prev, [claim.id]: claim.admin_note || '' }));
                  }
                }}
                className="w-full p-4 flex items-start gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <span className={`mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${st.color}`}>
                  {st.label}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{claim.title}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {userName} · Unidad {unitId} · {new Date(claim.created_at).toLocaleDateString('es-AR')}
                  </p>
                  {claim.category && (
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded mt-1 inline-block">
                      {claim.category}
                    </span>
                  )}
                </div>
                {isOpen ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-3 space-y-3">
                  {claim.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                      {claim.description}
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Estado</label>
                      <select
                        value={statusInputs[claim.id] ?? claim.status}
                        onChange={e => setStatusInputs(prev => ({ ...prev, [claim.id]: e.target.value }))}
                        className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="open">Abierto</option>
                        <option value="pending">En proceso</option>
                        <option value="closed">Resuelto</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Nota de respuesta</label>
                      <input
                        type="text"
                        value={noteInputs[claim.id] ?? ''}
                        onChange={e => setNoteInputs(prev => ({ ...prev, [claim.id]: e.target.value }))}
                        placeholder="Mensaje para el propietario..."
                        className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleSave(claim)}
                      disabled={saving === claim.id}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                    >
                      {saving === claim.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Guardar
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
