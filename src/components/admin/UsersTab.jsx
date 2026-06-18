import { useState, useEffect, useCallback } from 'react';
import { Loader2, Users, Plus } from 'lucide-react';
import { fetchAllProfiles, updateProfileRole, createConsortiumMember } from '../../services/data.service';
import { fetchUnits } from '../../services/units.service';
import { useToast } from '../Toast';
import { ROLE_OPTIONS, ROLE_BADGE, LoadingSpinner, EmptyState } from './shared';
import Pagination from './Pagination';

export default function UsersTab({ userProfile }) {
  const toast = useToast();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState(null);
  const [, setPage] = useState(0);
  const [pagination, setPagination] = useState(null);
  const [units, setUnits] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ fullName: '', email: '', unitId: '', role: 'resident' });
  const [adding, setAdding] = useState(false);
  const [createdCreds, setCreatedCreds] = useState(null);

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

  useEffect(() => {
    if (userProfile?.consortium_id) fetchUnits(userProfile.consortium_id).then(setUnits).catch(() => {});
  }, [userProfile?.consortium_id]);

  async function handleAddMember(e) {
    e.preventDefault();
    if (!addForm.email.trim()) { toast.error('Ingresá el email de la persona'); return; }
    setAdding(true);
    try {
      const res = await createConsortiumMember({
        email: addForm.email.trim(), fullName: addForm.fullName.trim(),
        consortiumId: userProfile?.consortium_id, unitId: addForm.unitId || null, role: addForm.role,
      });
      if (res?.tempPassword) {
        setCreatedCreds({ email: addForm.email.trim(), tempPassword: res.tempPassword });
        toast.success('Persona agregada');
      } else {
        toast.success('Ese usuario ya existía: quedó vinculado al consorcio');
      }
      setAddForm({ fullName: '', email: '', unitId: '', role: 'resident' });
      setShowAdd(false);
      loadPage(0);
    } catch (err) {
      toast.error(err.message || 'No se pudo agregar la persona');
    } finally {
      setAdding(false);
    }
  }

  // Un admin solo asigna propietario/inquilino; super_admin asigna cualquier rol.
  const isSuper = userProfile?.role === 'super_admin';
  const roleChoices = isSuper ? ROLE_OPTIONS : ROLE_OPTIONS.filter(r => r.value === 'resident' || r.value === 'owner');

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
  return (
    <div className="space-y-4">
      {createdCreds && (
        <div className="bg-emerald-50 dark:bg-emerald-400/[0.10] border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-start gap-3">
          <Users size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Persona creada</p>
            <p className="text-xs text-slate-600 dark:text-ink-mid mt-0.5">Compartile estas credenciales (puede cambiar la contraseña después):</p>
            <p className="text-xs font-mono mt-1 text-slate-800 dark:text-ink-hi break-all">
              {createdCreds.email} · contraseña: <span className="font-bold">{createdCreds.tempPassword}</span>
            </p>
          </div>
          <button onClick={() => setCreatedCreds(null)} className="p-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] text-xs">cerrar</button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500 dark:text-ink-mid">
          {profiles.length} usuario{profiles.length !== 1 ? 's' : ''} registrado{profiles.length !== 1 ? 's' : ''} en el consorcio.
        </p>
        <button onClick={() => setShowAdd(v => !v)} className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0">
          <Plus size={13} /> {showAdd ? 'Cerrar' : 'Agregar persona'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAddMember} className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-4 space-y-3">
          <h5 className="font-bold text-slate-800 dark:text-ink-hi text-sm">Agregar residente / propietario</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" value={addForm.fullName} onChange={e => setAddForm(p => ({ ...p, fullName: e.target.value }))} placeholder="Nombre y apellido" className="w-full border border-slate-200 dark:border-white/[0.09] rounded-lg px-3 py-2 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none" />
            <input type="email" value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} placeholder="email@persona.com" className="w-full border border-slate-200 dark:border-white/[0.09] rounded-lg px-3 py-2 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none" required />
            <select value={addForm.unitId} onChange={e => setAddForm(p => ({ ...p, unitId: e.target.value }))} className="w-full border border-slate-200 dark:border-white/[0.09] rounded-lg px-3 py-2 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none">
              <option value="">— Sin unidad —</option>
              {units.map(u => <option key={u.id} value={u.id}>Unidad {u.name}</option>)}
            </select>
            <select value={addForm.role} onChange={e => setAddForm(p => ({ ...p, role: e.target.value }))} className="w-full border border-slate-200 dark:border-white/[0.09] rounded-lg px-3 py-2 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none">
              <option value="resident">Inquilino</option>
              <option value="owner">Propietario</option>
            </select>
          </div>
          <button type="submit" disabled={adding} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Crear y vincular
          </button>
        </form>
      )}

      {profiles.length === 0 ? (
        <EmptyState icon={Users} text="No hay usuarios registrados en este consorcio" />
      ) : (
      <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] overflow-hidden">
        {/* Header */}
        <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 bg-slate-50 dark:bg-surface-inset border-b border-slate-100 dark:border-white/[0.07]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-ink-low">Nombre</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-ink-low">Unidad</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-ink-low">Registro</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-ink-low">Rol</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
          {profiles.map(p => (
            <div key={p.id} className="flex flex-col sm:grid sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center gap-2 sm:gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors">
              {/* Nombre */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-400/[0.14] flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                    {(p.full_name || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-semibold text-slate-800 dark:text-ink-hi truncate">
                  {p.full_name || 'Sin nombre'}
                </span>
              </div>

              {/* Unidad */}
              <span className="text-sm text-slate-500 dark:text-ink-mid sm:text-left">
                {p.unit_label ? `Unidad ${p.unit_label}` : (p.unit_id ? 'Unidad asignada' : '—')}
              </span>

              {/* Fecha registro */}
              <span className="text-xs text-slate-400 dark:text-ink-low">
                {p.created_at ? new Date(p.created_at).toLocaleDateString('es-AR') : '—'}
              </span>

              {/* Rol selector inline */}
              <div className="flex items-center gap-2">
                <span className={`hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_BADGE[p.role] ?? ROLE_BADGE.resident}`}>
                  {ROLE_OPTIONS.find(r => r.value === p.role)?.label ?? p.role}
                </span>
                <select
                  value={p.role ?? 'resident'}
                  disabled={savingRole === p.id || (!isSuper && (p.role === 'admin' || p.role === 'super_admin'))}
                  onChange={e => handleRoleChange(p.id, e.target.value)}
                  className="border border-slate-200 dark:border-white/[0.09] rounded-lg px-2 py-1 text-xs bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none disabled:opacity-60 cursor-pointer"
                >
                  {roleChoices.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                {savingRole === p.id && <Loader2 size={13} className="animate-spin text-brand-500 shrink-0" />}
              </div>
            </div>
          ))}
        </div>
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
