import { useState, useEffect } from 'react';
import {
  ShieldCheck, AlertCircle, DollarSign, Calendar, Megaphone, FileText,
  ChevronDown, ChevronUp, Check, X, Clock, Loader2, Trash2, Pin,
  Receipt, Users, Wrench, Plus, CheckCircle, Building2, Copy, RefreshCw,
} from 'lucide-react';
import {
  fetchAllClaims, updateClaimStatus,
  createExpense,
  fetchAllReservations, updateReservationStatus,
  fetchAnnouncements, createAnnouncement, deleteAnnouncement,
  fetchDocuments, updateDocumentStatus, deleteDocument,
  fetchExpensePeriods, createExpensePeriod, fetchPeriodItems, createPeriodItems,
  fetchAllConversations,
  fetchMaintenanceTasks, createMaintenanceTask, completeMaintenanceTask,
  updateConsortium, fetchConsortiumMembers,
  fetchAllProfiles, updateProfileRole, regenerateInviteCode,
} from '../services/data.service';
import { useToast } from './Toast';

const TABS = [
  { id: 'usuarios',      label: 'Usuarios',       icon: Users },
  { id: 'claims',        label: 'Reclamos',       icon: AlertCircle },
  { id: 'expenses',      label: 'Expensas',       icon: DollarSign },
  { id: 'liquidacion',   label: 'Liquidación',    icon: Receipt },
  { id: 'reservations',  label: 'Reservas',       icon: Calendar },
  { id: 'announcements', label: 'Comunicados',    icon: Megaphone },
  { id: 'documents',     label: 'Documentos',     icon: FileText },
  { id: 'maintenance',   label: 'Mantenimiento',  icon: Wrench },
  { id: 'consorcio',     label: 'Consorcio',      icon: Building2 },
];

const STATUS_LABELS = {
  open:        { label: 'Abierto',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  pending:     { label: 'En proceso', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  closed:      { label: 'Resuelto',   color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  approved:    { label: 'Aprobada',   color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  rejected:    { label: 'Rechazada',  color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

const DOC_TYPES_MAP = {
  general:   'General',
  identity:  'Identidad',
  ownership: 'Propiedad',
  request:   'Solicitud',
  complaint: 'Reclamo',
  other:     'Otro',
};

const DOC_STATUS = {
  pending:      { label: 'Pendiente',   color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  approved:     { label: 'Aprobado',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  rejected:     { label: 'Rechazado',   color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  under_review: { label: 'En revisión', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
};

const EXPENSE_CATEGORIES = [
  'Mantenimiento', 'Limpieza', 'Electricidad', 'Gas', 'Agua',
  'Seguro', 'Administración', 'Amenities', 'Ascensores', 'Otro',
];

// ─── Usuarios ─────────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: 'resident', label: 'Residente' },
  { value: 'admin',    label: 'Admin' },
  { value: 'owner',    label: 'Propietario' },
];

const ROLE_BADGE = {
  admin:    'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
  owner:    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  resident: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
};

function UsersTab({ userProfile }) {
  const toast = useToast();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState(null);

  useEffect(() => {
    fetchAllProfiles(userProfile?.consortium_id)
      .then(setProfiles)
      .catch(e => toast.error(e.message, 'Error al cargar usuarios'))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, toast]);

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
    </div>
  );
}

// ─── Reclamos ─────────────────────────────────────────────────────────────────

function ClaimsTab({ session }) {
  const toast = useToast();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(null);
  const [noteInputs, setNoteInputs] = useState({});
  const [statusInputs, setStatusInputs] = useState({});

  useEffect(() => {
    fetchAllClaims()
      .then(setClaims)
      .catch((e) => toast.error(e.message, 'Error al cargar reclamos'))
      .finally(() => setLoading(false));
  }, [toast]);

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
    </div>
  );
}

// ─── Expensas ─────────────────────────────────────────────────────────────────

function ExpensesTab({ session, userProfile }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ category: EXPENSE_CATEGORIES[0], amount: '' });

  function setField(k, v) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      toast.error('Ingresá un monto válido');
      return;
    }
    setSaving(true);
    try {
      await createExpense({
        category: form.category,
        amount: Number(form.amount),
        consortiumId: userProfile?.consortium_id,
      });
      toast.success('Expensa cargada correctamente');
      setForm({ category: EXPENSE_CATEGORIES[0], amount: '' });
    } catch (e) {
      toast.error(e.message, 'Error al cargar expensa');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Cargá un nuevo ítem de expensa. Aparecerá en el gráfico del dashboard de todos los propietarios.
      </p>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 space-y-4 shadow-sm">
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Categoría</label>
          <select
            value={form.category}
            onChange={e => setField('category', e.target.value)}
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Monto ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={e => setField('amount', e.target.value)}
            placeholder="Ej: 15000"
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />}
          Cargar Expensa
        </button>
      </form>
    </div>
  );
}

// ─── Reservas ─────────────────────────────────────────────────────────────────

function ReservationsTab() {
  const toast = useToast();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [saving, setSaving] = useState(null);
  const [noteInputs, setNoteInputs] = useState({});

  useEffect(() => {
    fetchAllReservations()
      .then(setReservations)
      .catch(e => toast.error(e.message, 'Error al cargar reservas'))
      .finally(() => setLoading(false));
  }, [toast]);

  async function handleAction(res, status) {
    setSaving(res.id);
    try {
      const updated = await updateReservationStatus(res.id, status, noteInputs[res.id] || undefined);
      setReservations(prev => prev.map(r => r.id === res.id ? { ...r, ...updated, profiles: r.profiles } : r));
      toast.success(status === 'approved' ? 'Reserva aprobada' : 'Reserva rechazada');
    } catch (e) {
      toast.error(e.message, 'Error al actualizar reserva');
    } finally {
      setSaving(null);
    }
  }

  const filtered = filter === 'all' ? reservations : reservations.filter(r => r.status === filter);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {['pending', 'approved', 'rejected', 'all'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === s
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {s === 'all' ? 'Todas' : STATUS_LABELS[s]?.label ?? s}
            {s !== 'all' && (
              <span className="ml-1.5 opacity-70">
                ({reservations.filter(r => r.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Calendar} text="No hay reservas en esta categoría" />
      ) : (
        filtered.map(res => {
          const st = STATUS_LABELS[res.status] || STATUS_LABELS.pending;
          const userName = res.profiles?.full_name || 'Usuario';
          const unitId = res.profiles?.unit_id || '—';
          const isPending = res.status === 'pending';

          return (
            <div key={res.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4">
              <div className="flex items-start gap-3">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 mt-0.5 ${st.color}`}>
                  {st.label}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{res.amenity_name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {userName} · Unidad {unitId}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {new Date(res.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} · {res.time_slot}
                  </p>
                  {res.admin_note && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">Nota: {res.admin_note}</p>
                  )}
                </div>
              </div>
              {isPending && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
                  <input
                    type="text"
                    value={noteInputs[res.id] || ''}
                    onChange={e => setNoteInputs(prev => ({ ...prev, [res.id]: e.target.value }))}
                    placeholder="Nota opcional para el propietario..."
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleAction(res, 'rejected')}
                      disabled={saving === res.id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
                    >
                      {saving === res.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                      Rechazar
                    </button>
                    <button
                      onClick={() => handleAction(res, 'approved')}
                      disabled={saving === res.id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
                    >
                      {saving === res.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Aprobar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Comunicados ──────────────────────────────────────────────────────────────

function AnnouncementsTab({ session, userProfile }) {
  const toast = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState({ title: '', body: '', type: 'info', pinned: false });

  function setField(k, v) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  useEffect(() => {
    fetchAnnouncements(userProfile?.consortium_id)
      .then(setAnnouncements)
      .catch(e => toast.error(e.message, 'Error al cargar comunicados'))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, toast]);

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
    </div>
  );
}

// ─── Documentos ───────────────────────────────────────────────────────────────

function DocumentsTab({ session, userProfile }) {
  const toast = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(null);
  const [noteInputs, setNoteInputs] = useState({});
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetchDocuments(userProfile?.consortium_id, null, true)
      .then(setDocuments)
      .catch(e => toast.error(e.message, 'Error al cargar documentos'))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, toast]);

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
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
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
            <div key={doc.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <button
                onClick={() => {
                  setExpanded(isOpen ? null : doc.id);
                  if (!isOpen) setNoteInputs(prev => ({ ...prev, [doc.id]: doc.admin_notes || '' }));
                }}
                className="w-full p-4 flex items-start gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <span className={`mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${st.color}`}>
                  {st.label}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{doc.title}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {userName} · Unidad {unitId} · {new Date(doc.created_at).toLocaleDateString('es-AR')}
                  </p>
                  {doc.doc_type && doc.doc_type !== 'general' && (
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded mt-1 inline-block">
                      {DOC_TYPES_MAP[doc.doc_type] ?? doc.doc_type}
                    </span>
                  )}
                </div>
                {isOpen ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-3 space-y-3">
                  {doc.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                      {doc.description}
                    </p>
                  )}
                  {doc.file_url && (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <FileText size={13} /> Ver archivo adjunto
                    </a>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                      Nota para el residente <span className="font-normal">(opcional)</span>
                    </label>
                    <textarea
                      value={noteInputs[doc.id] ?? ''}
                      onChange={e => setNoteInputs(prev => ({ ...prev, [doc.id]: e.target.value }))}
                      rows={2}
                      placeholder="Mensaje al residente..."
                      className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleStatus(doc, 'under_review')}
                      disabled={saving === doc.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors disabled:opacity-60"
                    >
                      <Clock size={13} /> En revisión
                    </button>
                    <button
                      onClick={() => handleStatus(doc, 'approved')}
                      disabled={saving === doc.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors disabled:opacity-60"
                    >
                      {saving === doc.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      Aprobar
                    </button>
                    <button
                      onClick={() => handleStatus(doc, 'rejected')}
                      disabled={saving === doc.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-100 transition-colors disabled:opacity-60"
                    >
                      <X size={13} /> Rechazar
                    </button>
                    <button
                      onClick={() => handleDelete(doc)}
                      disabled={saving === doc.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors disabled:opacity-60"
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
    </div>
  );
}

// ─── Liquidación de expensas ──────────────────────────────────────────────────

function LiquidacionTab({ session, userProfile }) {
  const toast = useToast();
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [periodItems, setPeriodItems] = useState({});
  const [loadingItems, setLoadingItems] = useState(null);
  const [form, setForm] = useState({
    period: new Date().toISOString().slice(0, 7),
    totalAmount: '',
    dueDate: '',
    amountPerUnit: '',
  });

  useEffect(() => {
    fetchExpensePeriods(userProfile?.consortium_id)
      .then(setPeriods)
      .catch(e => toast.error(e.message, 'Error al cargar períodos'))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, toast]);

  function setField(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  async function handleCreatePeriod(e) {
    e.preventDefault();
    if (!form.totalAmount || Number(form.totalAmount) <= 0) { toast.error('Ingresá un monto válido'); return; }
    if (!form.dueDate) { toast.error('Seleccioná una fecha de vencimiento'); return; }
    setSaving(true);
    try {
      const p = await createExpensePeriod({
        period: form.period,
        totalAmount: Number(form.totalAmount),
        dueDate: form.dueDate,
        consortiumId: userProfile?.consortium_id,
        createdBy: session.user.id,
      });
      setPeriods(prev => [p, ...prev]);
      toast.success('Período creado');
      setForm({ period: new Date().toISOString().slice(0, 7), totalAmount: '', dueDate: '', amountPerUnit: '' });

      // Push notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('ConsorcioTrust', {
          body: `Nueva expensa publicada para el período ${form.period}`,
          icon: '/favicon.ico',
        });
      }
    } catch (e) {
      toast.error(e.message, 'Error al crear período');
    } finally {
      setSaving(false);
    }
  }

  async function handleDistribute(period) {
    const amount = Number(form.amountPerUnit);
    if (!amount || amount <= 0) { toast.error('Ingresá el monto por unidad'); return; }
    setSaving(period.id);
    try {
      // Obtener todos los perfiles del consorcio
      const { supabase } = await import('../lib/supabase');
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, unit_id')
        .eq('consortium_id', userProfile?.consortium_id)
        .not('unit_id', 'is', null);

      if (!profiles?.length) { toast.error('No se encontraron unidades en este consorcio'); return; }

      const items = profiles.map(p => ({
        period_id: period.id,
        unit_id: p.unit_id,
        user_id: p.id,
        amount,
      }));

      await createPeriodItems(items);
      toast.success(`Expensas distribuidas a ${items.length} unidades`);
    } catch (e) {
      toast.error(e.message, 'Error al distribuir');
    } finally {
      setSaving(null);
    }
  }

  async function handleExpand(period) {
    const isOpen = expanded === period.id;
    setExpanded(isOpen ? null : period.id);
    if (!isOpen && !periodItems[period.id]) {
      setLoadingItems(period.id);
      try {
        const items = await fetchPeriodItems(period.id);
        setPeriodItems(prev => ({ ...prev, [period.id]: items }));
      } catch (e) {
        toast.error(e.message, 'Error al cargar ítems');
      } finally {
        setLoadingItems(null);
      }
    }
  }

  function formatPeriod(p) {
    const [y, m] = p.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  }

  return (
    <div className="space-y-6">
      {/* Formulario de nueva liquidación */}
      <form onSubmit={handleCreatePeriod} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm space-y-4">
        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Nueva liquidación mensual</h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Período</label>
            <input
              type="month"
              value={form.period}
              onChange={e => setField('period', e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Monto total ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.totalAmount}
              onChange={e => setField('totalAmount', e.target.value)}
              placeholder="Ej: 500000"
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Fecha de vencimiento</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={e => setField('dueDate', e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Monto por unidad (para distribución automática)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amountPerUnit}
              onChange={e => setField('amountPerUnit', e.target.value)}
              placeholder="Ej: 25000"
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="pt-6">
            <button
              type="submit"
              disabled={saving === true}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              {saving === true ? <Loader2 size={14} className="animate-spin" /> : <Receipt size={14} />}
              Publicar
            </button>
          </div>
        </div>
      </form>

      {/* Lista de períodos */}
      {loading ? (
        <LoadingSpinner />
      ) : periods.length === 0 ? (
        <EmptyState icon={Receipt} text="No hay liquidaciones publicadas aún" />
      ) : (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
            Períodos publicados ({periods.length})
          </h4>
          {periods.map(period => {
            const isOpen = expanded === period.id;
            const items = periodItems[period.id] ?? [];
            return (
              <div key={period.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <button
                  onClick={() => handleExpand(period)}
                  className="w-full p-4 flex items-center gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <Receipt size={18} className="text-blue-500 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{formatPeriod(period.period)}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Total: ${Number(period.total_amount).toLocaleString('es-AR')} · Vence: {new Date(period.due_date).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-slate-700 p-4 space-y-3">
                    {/* Distribuir */}
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.amountPerUnit}
                        onChange={e => setField('amountPerUnit', e.target.value)}
                        placeholder="Monto por unidad"
                        className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button
                        onClick={() => handleDistribute(period)}
                        disabled={saving === period.id}
                        className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors shrink-0"
                      >
                        {saving === period.id ? <Loader2 size={12} className="animate-spin" /> : <Users size={12} />}
                        Distribuir
                      </button>
                    </div>

                    {/* Ítems */}
                    {loadingItems === period.id ? (
                      <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-blue-500" /></div>
                    ) : items.length === 0 ? (
                      <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">Sin ítems distribuidos aún</p>
                    ) : (
                      <div className="space-y-2">
                        {items.map(item => (
                          <div key={item.id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 dark:border-slate-700 last:border-0">
                            <div>
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                Unidad {item.unit_id}
                              </span>
                              {item.profiles?.full_name && (
                                <span className="text-slate-400 dark:text-slate-500 ml-2">({item.profiles.full_name})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-800 dark:text-slate-100">
                                ${Number(item.amount).toLocaleString('es-AR')}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                item.status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                              }`}>
                                {item.status === 'paid' ? 'Pagado' : 'Pendiente'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Mantenimiento ────────────────────────────────────────────────────────────

const RECURRENCES = [
  { value: 'weekly',    label: 'Semanal' },
  { value: 'monthly',   label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'biannual',  label: 'Semestral' },
  { value: 'annual',    label: 'Anual' },
];

const MAINTENANCE_CATEGORIES = ['Limpieza', 'Eléctrico', 'Plomería', 'Ascensor', 'Jardín', 'Pintura', 'Otro'];

function MaintenanceTab({ session, userProfile }) {
  const toast = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(null);
  const [form, setForm] = useState({
    name: '', category: MAINTENANCE_CATEGORIES[0],
    recurrence: 'monthly', next_due: '', estimated_cost: '', notes: '',
  });

  function setField(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  useEffect(() => {
    fetchMaintenanceTasks(userProfile?.consortium_id)
      .then(setTasks)
      .catch(e => toast.error(e.message, 'Error al cargar tareas'))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, toast]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Ingresá un nombre para la tarea'); return; }
    setSaving(true);
    try {
      const task = await createMaintenanceTask({
        consortiumId: userProfile?.consortium_id,
        name: form.name.trim(),
        category: form.category,
        recurrence: form.recurrence,
        nextDue: form.next_due || null,
        estimatedCost: form.estimated_cost ? Number(form.estimated_cost) : null,
        notes: form.notes.trim() || null,
        createdBy: session.user.id,
      });
      setTasks(prev => [task, ...prev]);
      setForm({ name: '', category: MAINTENANCE_CATEGORIES[0], recurrence: 'monthly', next_due: '', estimated_cost: '', notes: '' });
      toast.success('Tarea de mantenimiento creada');
    } catch (e) {
      toast.error(e.message, 'Error al crear tarea');
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(id) {
    setCompleting(id);
    try {
      const updated = await completeMaintenanceTask(id);
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));
      toast.success('Tarea completada');
    } catch (e) {
      toast.error(e.message, 'Error al completar tarea');
    } finally {
      setCompleting(null);
    }
  }

  function getDaysUntil(dateStr) {
    if (!dateStr) return null;
    const diff = new Date(dateStr + 'T00:00:00') - new Date();
    return Math.ceil(diff / 86400000);
  }

  function urgencyClasses(days) {
    if (days === null) return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    if (days < 0)  return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    if (days <= 7)  return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    if (days <= 14) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
  }

  return (
    <div className="space-y-6">
      {/* Create task form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm space-y-4">
        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
          <Wrench size={16} className="text-amber-500" />
          Agregar tarea de mantenimiento
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Nombre de la tarea</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="Ej: Limpieza de tanques"
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Categoría</label>
            <select
              value={form.category}
              onChange={e => setField('category', e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
            >
              {MAINTENANCE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Recurrencia</label>
            <select
              value={form.recurrence}
              onChange={e => setField('recurrence', e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
            >
              {RECURRENCES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Próximo vencimiento</label>
            <input
              type="date"
              value={form.next_due}
              onChange={e => setField('next_due', e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Costo estimado ($)</label>
            <input
              type="number"
              min="0"
              value={form.estimated_cost}
              onChange={e => setField('estimated_cost', e.target.value)}
              placeholder="Opcional"
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Notas</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              placeholder="Observaciones..."
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Crear tarea
        </button>
      </form>

      {/* Task list */}
      {loading ? (
        <LoadingSpinner />
      ) : tasks.length === 0 ? (
        <EmptyState icon={Wrench} text="No hay tareas de mantenimiento registradas" />
      ) : (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
            Tareas registradas ({tasks.length})
          </h4>
          {tasks.map(task => {
            const days = getDaysUntil(task.next_due);
            const urgency = urgencyClasses(days);
            return (
              <div key={task.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 flex items-start gap-4">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center shrink-0">
                  <Wrench size={18} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{task.name}</p>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded">{task.category}</span>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {RECURRENCES.find(r => r.value === task.recurrence)?.label ?? task.recurrence}
                    {task.estimated_cost ? ` · Est. $${Number(task.estimated_cost).toLocaleString('es-AR')}` : ''}
                  </p>
                  {task.next_due && (
                    <span className={`inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${urgency}`}>
                      {days === null ? 'Sin fecha'
                        : days < 0 ? `Vencido hace ${Math.abs(days)}d`
                        : days === 0 ? 'Vence hoy'
                        : `Vence en ${days}d`}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleComplete(task.id)}
                  disabled={completing === task.id}
                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0"
                >
                  {completing === task.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                  Completar
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Consorcio ────────────────────────────────────────────────────────────────

function ConsorcioTab({ session, userProfile }) {
  const toast = useToast();
  const [consortium, setConsortium] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', city: '' });

  useEffect(() => {
    if (!userProfile?.consortium_id) { setLoading(false); return; }
    Promise.all([
      import('../services/data.service').then(m => m.fetchConsortium(userProfile.consortium_id)),
      fetchConsortiumMembers(userProfile.consortium_id),
    ]).then(([c, m]) => {
      if (c) {
        setConsortium(c);
        setForm({ name: c.name || '', address: c.address || '', city: c.city || '' });
      }
      setMembers(m);
    }).catch(e => toast.error(e.message, 'Error al cargar consorcio'))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, toast]);

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    try {
      const updated = await updateConsortium(userProfile.consortium_id, {
        name: form.name.trim(),
        address: form.address.trim() || null,
        city: form.city.trim() || null,
      });
      setConsortium(updated);
      toast.success('Consorcio actualizado');
    } catch (e) {
      toast.error(e.message, 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  function handleCopy() {
    if (!consortium?.invite_code) return;
    navigator.clipboard.writeText(consortium.invite_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleRegenerate() {
    if (!userProfile?.consortium_id) return;
    setRegenerating(true);
    try {
      const updated = await regenerateInviteCode(userProfile.consortium_id);
      setConsortium(prev => ({ ...prev, invite_code: updated.invite_code }));
      toast.success('Código regenerado correctamente');
    } catch (e) {
      toast.error(e.message, 'Error al regenerar código');
    } finally {
      setRegenerating(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Editar datos */}
      <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm space-y-4">
        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
          <Building2 size={16} className="text-brand-600" />
          Datos del Consorcio
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
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
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Ciudad</label>
            <input
              type="text"
              value={form.city}
              onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
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
          Guardar cambios
        </button>
      </form>

      {/* Código de invitación */}
      {consortium?.invite_code && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-3">Código de Invitación</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Compartí este código con los residentes para que puedan unirse al consorcio.
          </p>
          <div className="flex items-center gap-3">
            <span className="flex-1 font-mono text-2xl font-bold tracking-widest text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl px-4 py-3 text-center select-all">
              {consortium.invite_code}
            </span>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                copied
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-600'
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              title="Regenerar código"
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-accent-600 disabled:opacity-60"
            >
              {regenerating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Regenerar
            </button>
          </div>
        </div>
      )}

      {/* Lista de miembros */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
            <Users size={16} className="text-slate-400" />
            Miembros ({members.length})
          </h4>
        </div>
        {members.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">Sin miembros registrados</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                    {(m.full_name || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{m.full_name || 'Sin nombre'}</p>
                  {m.unit_id && <p className="text-xs text-slate-400 dark:text-slate-500">Unidad {m.unit_id}</p>}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  m.role === 'admin'
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                }`}>
                  {m.role === 'admin' ? 'Admin' : 'Residente'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 size={32} className="animate-spin text-blue-500" />
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center">
      <Icon size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
      <p className="text-slate-500 dark:text-slate-400 text-sm">{text}</p>
    </div>
  );
}

// ─── Vista principal ──────────────────────────────────────────────────────────

export default function AdminView({ session, userProfile }) {
  const [activeTab, setActiveTab] = useState('usuarios');

  if (!userProfile || userProfile.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 animate-fade-in">
        <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-2xl">
          <ShieldCheck size={48} className="text-red-400" />
        </div>
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Acceso restringido</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm text-center max-w-xs">
          Esta sección es exclusiva para administradores del consorcio. Tu cuenta no tiene permisos de administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-6 rounded-2xl text-white shadow-lg">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <ShieldCheck size={24} />
          Panel de Administrador
        </h3>
        <p className="text-slate-300 mt-1 text-sm">
          Gestioná reclamos, expensas, liquidaciones, reservas, comunicados y documentos
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Contenido */}
      {activeTab === 'usuarios'      && <UsersTab userProfile={userProfile} />}
      {activeTab === 'claims'        && <ClaimsTab session={session} userProfile={userProfile} />}
      {activeTab === 'expenses'      && <ExpensesTab session={session} userProfile={userProfile} />}
      {activeTab === 'liquidacion'   && <LiquidacionTab session={session} userProfile={userProfile} />}
      {activeTab === 'reservations'  && <ReservationsTab />}
      {activeTab === 'announcements' && <AnnouncementsTab session={session} userProfile={userProfile} />}
      {activeTab === 'documents'     && <DocumentsTab session={session} userProfile={userProfile} />}
      {activeTab === 'maintenance'   && <MaintenanceTab session={session} userProfile={userProfile} />}
      {activeTab === 'consorcio'     && <ConsorcioTab session={session} userProfile={userProfile} />}
    </div>
  );
}
