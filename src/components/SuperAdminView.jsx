import { useState, useEffect } from 'react';
import {
  ShieldCheck, Building2, Plus, Loader2, Users, Trash2,
  Check, X, Mail, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  fetchAllConsortia,
  createConsortium,
  fetchAllProfiles,
  assignAdminToConsortium,
  revokeAdminFromConsortium,
  fetchAdminConsortia,
} from '../services/data.service';
import { useToast } from './Toast';

// ─── Panel de consorcios ────────────────────────────────────────────────────────

function ConsortiaPanel({ session }) {
  const toast = useToast();
  const [consortia, setConsortia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', city: '' });
  const [expanded, setExpanded] = useState(null);

  // All profiles for admin assignment
  const [admins, setAdmins] = useState([]);
  const [assignments, setAssignments] = useState({}); // consortiumId -> [{id, full_name}]
  const [assigningTo, setAssigningTo] = useState(null);
  const [selectedAdmin, setSelectedAdmin] = useState('');

  useEffect(() => {
    Promise.all([fetchAllConsortia(), fetchAllProfiles()])
      .then(([c, p]) => {
        setConsortia(c);
        setAdmins(p.filter(pr => ['admin', 'super_admin'].includes(pr.role)));
      })
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [toast]);

  async function loadAssignments(consortiumId) {
    if (assignments[consortiumId]) return;
    try {
      const all = await fetchAllProfiles();
      const assigned = [];
      for (const profile of all) {
        const consortia = await fetchAdminConsortia(profile.id);
        if (consortia.some(c => c.id === consortiumId)) {
          assigned.push(profile);
        }
      }
      setAssignments(prev => ({ ...prev, [consortiumId]: assigned }));
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    try {
      const c = await createConsortium(form.name.trim(), form.address.trim(), form.city.trim());
      setConsortia(prev => [c, ...prev]);
      setForm({ name: '', address: '', city: '' });
      setShowForm(false);
      toast.success('Consorcio creado');
    } catch (err) {
      toast.error(err.message, 'Error al crear');
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign(consortiumId) {
    if (!selectedAdmin) return;
    try {
      await assignAdminToConsortium(selectedAdmin, consortiumId, session.user.id);
      const profile = admins.find(a => a.id === selectedAdmin);
      setAssignments(prev => ({
        ...prev,
        [consortiumId]: [...(prev[consortiumId] || []), profile],
      }));
      setAssigningTo(null);
      setSelectedAdmin('');
      toast.success('Administrador asignado');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleRevoke(consortiumId, adminId) {
    try {
      await revokeAdminFromConsortium(adminId, consortiumId);
      setAssignments(prev => ({
        ...prev,
        [consortiumId]: (prev[consortiumId] || []).filter(a => a.id !== adminId),
      }));
      toast.success('Acceso revocado');
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-bold text-slate-800 dark:text-slate-100">
            Consorcios ({consortia.length})
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Creá y asigná administradores a cada consorcio
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus size={15} />
          {showForm ? 'Cancelar' : 'Nuevo consorcio'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 space-y-3"
        >
          <h5 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Nuevo consorcio</h5>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-3">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Nombre *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Ej: Edificio San Martín 1234"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Dirección</label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                placeholder="Av. Corrientes 1234"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Ciudad</label>
              <input
                type="text"
                value={form.city}
                onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                placeholder="Buenos Aires"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Crear consorcio
          </button>
        </form>
      )}

      <div className="space-y-3">
        {consortia.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-10 text-center">
            <Building2 size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-400 dark:text-slate-500">No hay consorcios registrados</p>
          </div>
        ) : (
          consortia.map(c => {
            const isExpanded = expanded === c.id;
            const assigned = assignments[c.id] || [];

            return (
              <div
                key={c.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => {
                    const next = isExpanded ? null : c.id;
                    setExpanded(next);
                    if (next) loadAssignments(c.id);
                  }}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-brand-600 dark:text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{c.name}</p>
                    {(c.address || c.city) && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                        {[c.address, c.city].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded">
                      {c.invite_code}
                    </span>
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-700 p-4 space-y-3">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Administradores asignados
                    </p>

                    {assigned.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-slate-500 italic">Sin administradores asignados</p>
                    ) : (
                      <div className="space-y-1">
                        {assigned.map(a => (
                          <div key={a.id} className="flex items-center gap-2 py-1">
                            <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400">
                                {(a.full_name || '?').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 truncate">
                              {a.full_name || a.id}
                            </span>
                            <button
                              onClick={() => handleRevoke(c.id, a.id)}
                              className="p-1 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Revocar acceso"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {assigningTo === c.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedAdmin}
                          onChange={e => setSelectedAdmin(e.target.value)}
                          className="flex-1 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
                        >
                          <option value="">Seleccionar administrador...</option>
                          {admins
                            .filter(a => !assigned.some(x => x.id === a.id))
                            .map(a => (
                              <option key={a.id} value={a.id}>{a.full_name || a.id}</option>
                            ))}
                        </select>
                        <button
                          onClick={() => handleAssign(c.id)}
                          disabled={!selectedAdmin}
                          className="p-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white transition-colors"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => { setAssigningTo(null); setSelectedAdmin(''); }}
                          className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAssigningTo(c.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        <Plus size={12} /> Asignar administrador
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Vista principal ────────────────────────────────────────────────────────────

export default function SuperAdminView({ session, userProfile }) {
  if (!userProfile || userProfile.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 animate-fade-in">
        <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-2xl">
          <ShieldCheck size={48} className="text-red-400" />
        </div>
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Acceso restringido</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm text-center max-w-xs">
          Esta sección es exclusiva para super administradores del sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-brand-700 to-brand-900 p-6 rounded-2xl text-white shadow-lg">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <ShieldCheck size={24} />
          Super Admin
        </h3>
        <p className="text-brand-200 mt-1 text-sm">
          Gestión global de consorcios y administradores
        </p>
      </div>

      <ConsortiaPanel session={session} />
    </div>
  );
}
