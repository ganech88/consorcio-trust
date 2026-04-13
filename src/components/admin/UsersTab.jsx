import { useState, useEffect, useCallback } from 'react';
import { Loader2, Users } from 'lucide-react';
import { fetchAllProfiles, updateProfileRole } from '../../services/data.service';
import { useToast } from '../Toast';
import { ROLE_OPTIONS, ROLE_BADGE, LoadingSpinner, EmptyState } from './shared';
import Pagination from './Pagination';

export default function UsersTab({ userProfile }) {
  const toast = useToast();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState(null);
  const [page, setPage] = useState(0);
  const [pagination, setPagination] = useState(null);

  const loadPage = useCallback((p) => {
    setLoading(true);
    fetchAllProfiles(userProfile?.consortium_id, { page: p })
      .then(result => {
        setProfiles(result.data);
        setPagination(result);
        setPage(p);
      })
      .catch(e => toast.error(e.message, 'Error al cargar usuarios'))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, toast]);

  useEffect(() => { loadPage(0); }, [loadPage]);

  async function handleRoleChange(profileId, newRole) {
    setSavingRole(profileId);
    try {
      const updated = await updateProfileRole(profileId, newRole);
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, role: updated.role } : p));
      toast.success('Rol actualizado');
    } catch (e) {
      toast.error(e.message, 'Error al cambiar rol');
    } finally {
      setSavingRole(null);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (profiles.length === 0) return <EmptyState icon={Users} text="No hay usuarios registrados en este consorcio" />;

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {profiles.length} usuario{profiles.length !== 1 ? 's' : ''} registrado{profiles.length !== 1 ? 's' : ''} en el consorcio.
      </p>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Nombre</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Unidad</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Registro</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Rol</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {profiles.map(p => (
            <div key={p.id} className="flex flex-col sm:grid sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center gap-2 sm:gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              {/* Nombre */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                    {(p.full_name || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {p.full_name || 'Sin nombre'}
                </span>
              </div>

              {/* Unidad */}
              <span className="text-sm text-slate-500 dark:text-slate-400 sm:text-left">
                {p.unit_id ? `Unidad ${p.unit_id}` : '—'}
              </span>

              {/* Fecha registro */}
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {p.created_at ? new Date(p.created_at).toLocaleDateString('es-AR') : '—'}
              </span>

              {/* Rol selector inline */}
              <div className="flex items-center gap-2">
                <span className={`hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_BADGE[p.role] ?? ROLE_BADGE.resident}`}>
                  {ROLE_OPTIONS.find(r => r.value === p.role)?.label ?? p.role}
                </span>
                <select
                  value={p.role ?? 'resident'}
                  disabled={savingRole === p.id}
                  onChange={e => handleRoleChange(p.id, e.target.value)}
                  className="border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none disabled:opacity-60 cursor-pointer"
                >
                  {ROLE_OPTIONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                {savingRole === p.id && <Loader2 size={13} className="animate-spin text-brand-500 shrink-0" />}
              </div>
            </div>
          ))}
        </div>
      </div>

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
