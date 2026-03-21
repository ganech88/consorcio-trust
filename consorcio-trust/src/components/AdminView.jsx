import { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, AlertCircle, DollarSign, Calendar, Megaphone, FileText,
  ChevronDown, ChevronUp, Check, X, Clock, Upload, Loader2, Trash2, Pin,
  Receipt, Users,
} from 'lucide-react';
import {
  fetchAllClaims, updateClaimStatus,
  createExpense,
  fetchAllReservations, updateReservationStatus,
  fetchAnnouncements, createAnnouncement, deleteAnnouncement,
  fetchDocuments, uploadDocument, deleteDocument,
  fetchExpensePeriods, createExpensePeriod, fetchPeriodItems, createPeriodItems,
  fetchAllConversations,
} from '../services/data.service';
import { useToast } from './Toast';

const TABS = [
  { id: 'claims',        label: 'Reclamos',      icon: AlertCircle },
  { id: 'expenses',      label: 'Expensas',      icon: DollarSign },
  { id: 'liquidacion',   label: 'Liquidación',   icon: Receipt },
  { id: 'reservations',  label: 'Reservas',      icon: Calendar },
  { id: 'announcements', label: 'Comunicados',   icon: Megaphone },
  { id: 'documents',     label: 'Documentos',    icon: FileText },
];

const STATUS_LABELS = {
  open:        { label: 'Abierto',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  pending:     { label: 'En proceso', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  closed:      { label: 'Resuelto',   color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  approved:    { label: 'Aprobada',   color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  rejected:    { label: 'Rechazada',  color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

const DOC_CATEGORIES = [
  { value: 'reglamentos', label: 'Reglamentos' },
  { value: 'actas',       label: 'Actas' },
  { value: 'expensas',    label: 'Expensas' },
  { value: 'seguros',     label: 'Seguros' },
  { value: 'general',     label: 'General' },
];

const EXPENSE_CATEGORIES = [
  'Mantenimiento', 'Limpieza', 'Electricidad', 'Gas', 'Agua',
  'Seguro', 'Administración', 'Amenities', 'Ascensores', 'Otro',
];

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
    fetchAnnouncements()
      .then(setAnnouncements)
      .catch(e => toast.error(e.message, 'Error al cargar comunicados'))
      .finally(() => setLoading(false));
  }, [toast]);

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
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('general');
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    fetchDocuments()
      .then(setDocuments)
      .catch(e => toast.error(e.message, 'Error al cargar documentos'))
      .finally(() => setLoading(false));
  }, [toast]);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) { toast.error('Seleccioná un archivo PDF'); return; }
    if (!name.trim()) { toast.error('Ingresá un nombre para el documento'); return; }
    setUploading(true);
    try {
      const doc = await uploadDocument(
        file, name.trim(), category,
        userProfile?.consortium_id, session.user.id
      );
      if (doc) setDocuments(prev => [doc, ...prev]);
      toast.success('Documento subido correctamente');
      setName('');
      setCategory('general');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      toast.error(e.message, 'Error al subir documento');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(doc) {
    setDeleting(doc.id);
    try {
      await deleteDocument(doc.id, doc.file_path);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      toast.success('Documento eliminado');
    } catch (e) {
      toast.error(e.message, 'Error al eliminar');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulario de carga */}
      <form onSubmit={handleUpload} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm space-y-4">
        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Subir nuevo documento (PDF)</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Nombre del documento</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Acta Asamblea 2026"
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Categoría</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {DOC_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Archivo PDF</label>
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
              file
                ? 'border-blue-300 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-700'
                : 'border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-600'
            }`}
          >
            {file ? (
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{file.name}</p>
            ) : (
              <div className="space-y-1">
                <Upload size={24} className="mx-auto text-slate-400 dark:text-slate-500" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Hacé clic para seleccionar un PDF</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Máximo 10 MB</p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={e => setFile(e.target.files?.[0] || null)}
          />
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          Subir Documento
        </button>
      </form>

      {/* Lista de documentos */}
      {loading ? <LoadingSpinner /> : (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
            Documentos cargados ({documents.length})
          </h4>
          {documents.length === 0 ? (
            <EmptyState icon={FileText} text="No hay documentos subidos aún" />
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
              {documents.map(doc => (
                <div key={doc.id} className="p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="bg-red-50 dark:bg-red-900/30 p-2.5 rounded-xl shrink-0">
                    <FileText size={18} className="text-red-500 dark:text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">{doc.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {DOC_CATEGORIES.find(c => c.value === doc.category)?.label ?? doc.category} ·{' '}
                      {new Date(doc.created_at).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors shrink-0"
                    title="Ver documento"
                  >
                    <FileText size={15} />
                  </a>
                  <button
                    onClick={() => handleDelete(doc)}
                    disabled={deleting === doc.id}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0 disabled:opacity-60"
                    title="Eliminar"
                  >
                    {deleting === doc.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
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
  const [activeTab, setActiveTab] = useState('claims');

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
      {activeTab === 'claims'        && <ClaimsTab session={session} userProfile={userProfile} />}
      {activeTab === 'expenses'      && <ExpensesTab session={session} userProfile={userProfile} />}
      {activeTab === 'liquidacion'   && <LiquidacionTab session={session} userProfile={userProfile} />}
      {activeTab === 'reservations'  && <ReservationsTab />}
      {activeTab === 'announcements' && <AnnouncementsTab session={session} userProfile={userProfile} />}
      {activeTab === 'documents'     && <DocumentsTab session={session} userProfile={userProfile} />}
    </div>
  );
}
