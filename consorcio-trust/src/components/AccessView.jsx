import { useState, useEffect } from 'react';
import {
  Package, UserCheck, Plus, Trash2, Loader2, CheckCircle, Clock,
  DoorOpen, QrCode, CalendarCheck,
} from 'lucide-react';
import {
  fetchVisitors, addVisitor, removeVisitor,
  fetchUserPackages, createPackage, collectPackage,
  fetchAuthorizedVisitors, createAuthorizedVisitor, checkInVisitor,
} from '../services/data.service';
import { useToast } from './Toast';
import Modal from './Modal';

const VISITOR_TYPES = ['Visita', 'Delivery', 'Empleada', 'Técnico', 'Otro'];

function formatDateTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('es-AR');
}

// ─── Pre-Authorized Visitors ──────────────────────────────────────────────────

function PreAuthSection({ session, userProfile, isAdmin }) {
  const toast = useToast();
  const [authorizations, setAuthorizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showQr, setShowQr] = useState(null);
  const [saving, setSaving] = useState(false);
  const [checkingIn, setCheckingIn] = useState(null);
  const [form, setForm] = useState({
    visitorName: '',
    visitorType: 'Visita',
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
    timeFrom: '',
    timeTo: '',
    note: '',
  });

  useEffect(() => {
    fetchAuthorizedVisitors(isAdmin ? null : session.user.id)
      .then(setAuthorizations)
      .catch(e => toast.error(e.message, 'Error al cargar autorizaciones'))
      .finally(() => setLoading(false));
  }, [session.user.id, isAdmin, toast]);

  async function handleSave(e) {
    e.preventDefault();
    if (!form.visitorName.trim()) { toast.error('Ingresá el nombre del visitante'); return; }
    setSaving(true);
    try {
      const auth = await createAuthorizedVisitor({
        consortiumId: userProfile?.consortium_id,
        userId: session.user.id,
        visitorName: form.visitorName.trim(),
        visitorType: form.visitorType,
        validFrom: form.validFrom || null,
        validUntil: form.validUntil || null,
        timeFrom: form.timeFrom || null,
        timeTo: form.timeTo || null,
        note: form.note.trim() || null,
      });
      setAuthorizations(prev => [auth, ...prev]);
      setForm({ visitorName: '', visitorType: 'Visita', validFrom: new Date().toISOString().split('T')[0], validUntil: '', timeFrom: '', timeTo: '', note: '' });
      setShowModal(false);
      toast.success('Visita pre-autorizada');
    } catch (e) {
      toast.error(e.message, 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleCheckIn(id) {
    setCheckingIn(id);
    try {
      const updated = await checkInVisitor(id, session.user.id);
      setAuthorizations(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a));
      toast.success('Ingreso registrado');
    } catch (e) {
      toast.error(e.message, 'Error al registrar ingreso');
    } finally {
      setCheckingIn(null);
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const todayAuths = authorizations.filter(a =>
    (!a.valid_from || a.valid_from <= today) &&
    (!a.valid_until || a.valid_until >= today)
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DoorOpen size={18} className="text-brand-500" />
          <h4 className="font-bold text-slate-800 dark:text-slate-100">Visitas pre-autorizadas</h4>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
        >
          <Plus size={13} />
          Pre-autorizar visita
        </button>
      </div>

      {/* Admin: today's expected visitors */}
      {isAdmin && todayAuths.length > 0 && (
        <div className="p-4 bg-brand-50 dark:bg-brand-900/20 border-b border-slate-100 dark:border-slate-700">
          <p className="text-xs font-bold text-brand-700 dark:text-brand-300 uppercase tracking-wider mb-3">
            Visitas esperadas hoy ({todayAuths.length})
          </p>
          <div className="space-y-2">
            {todayAuths.map(a => (
              <div key={a.id} className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{a.visitor_name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{a.visitor_type}</p>
                </div>
                {a.checked_in_at ? (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle size={12} />
                    {formatDateTime(a.checked_in_at)}
                  </span>
                ) : (
                  <button
                    onClick={() => handleCheckIn(a.id)}
                    disabled={checkingIn === a.id}
                    className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  >
                    {checkingIn === a.id ? <Loader2 size={11} className="animate-spin" /> : <CalendarCheck size={11} />}
                    Registrar ingreso
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Authorizations list */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-brand-500" />
          </div>
        ) : authorizations.length === 0 ? (
          <div className="p-8 text-center">
            <DoorOpen size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-slate-400 dark:text-slate-500 text-sm">No tenés visitas pre-autorizadas</p>
          </div>
        ) : (
          authorizations.map(auth => (
            <div key={auth.id} className="p-4 flex items-start gap-3">
              <div className="w-9 h-9 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                  {auth.visitor_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{auth.visitor_name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{auth.visitor_type}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Válido: {formatDate(auth.valid_from)}{auth.valid_until ? ` → ${formatDate(auth.valid_until)}` : ' en adelante'}
                  {auth.time_from && auth.time_to ? ` · ${auth.time_from}–${auth.time_to}` : ''}
                </p>
                {auth.checked_in_at && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                    <CheckCircle size={10} />
                    Ingresó: {formatDateTime(auth.checked_in_at)}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowQr(auth)}
                className="p-1.5 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
                title="Ver QR"
              >
                <QrCode size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* New authorization modal */}
      {showModal && (
        <Modal title="Pre-autorizar visita" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Nombre del visitante <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.visitorName}
                onChange={e => setForm(f => ({ ...f, visitorName: e.target.value }))}
                placeholder="Nombre completo"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tipo de visita</label>
              <div className="flex flex-wrap gap-2">
                {VISITOR_TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, visitorType: t }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      form.visitorType === t
                        ? 'bg-brand-600 border-brand-600 text-white'
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Válido desde</label>
                <input
                  type="date"
                  value={form.validFrom}
                  onChange={e => setForm(f => ({ ...f, validFrom: e.target.value }))}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Válido hasta</label>
                <input
                  type="date"
                  value={form.validUntil}
                  onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Hora desde (opc.)</label>
                <input
                  type="time"
                  value={form.timeFrom}
                  onChange={e => setForm(f => ({ ...f, timeFrom: e.target.value }))}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Hora hasta (opc.)</label>
                <input
                  type="time"
                  value={form.timeTo}
                  onChange={e => setForm(f => ({ ...f, timeTo: e.target.value }))}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nota (opc.)</label>
              <input
                type="text"
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Ej: Trae muebles, es de confianza..."
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-brand-600 to-brand-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <DoorOpen size={16} />}
                {saving ? 'Guardando...' : 'Guardar autorización'}
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* QR modal */}
      {showQr && (
        <Modal title="Código de acceso" onClose={() => setShowQr(null)}>
          <div className="flex flex-col items-center gap-4 py-4">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${showQr.id}`}
              alt="QR de autorización"
              width={180}
              height={180}
              className="rounded-xl border border-slate-200 dark:border-slate-600 shadow"
            />
            <div className="text-center">
              <p className="font-bold text-slate-800 dark:text-slate-100">{showQr.visitor_name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{showQr.visitor_type}</p>
              {showQr.valid_until && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Válido hasta {formatDate(showQr.valid_until)}
                </p>
              )}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center max-w-xs">
              Mostrá este código en la recepción para registrar el ingreso de tu visita.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Legacy Visitors ──────────────────────────────────────────────────────────

function VisitorsSection({ session, userProfile, isAdmin }) {
  const toast = useToast();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', docNumber: '' });
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    fetchVisitors(session.user.id)
      .then(setVisitors)
      .catch(e => toast.error(e.message, 'Error al cargar visitantes'))
      .finally(() => setLoading(false));
  }, [session.user.id, toast]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Ingresá el nombre del visitante'); return; }
    setSaving(true);
    try {
      const v = await addVisitor({
        unitId: userProfile?.unit_id ?? '',
        userId: session.user.id,
        name: form.name.trim(),
        docNumber: form.docNumber.trim() || null,
        consortiumId: userProfile?.consortium_id,
      });
      setVisitors(prev => [v, ...prev]);
      setForm({ name: '', docNumber: '' });
      setShowForm(false);
      toast.success('Visitante autorizado');
    } catch (e) {
      toast.error(e.message, 'Error al agregar visitante');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id) {
    setRemoving(id);
    try {
      await removeVisitor(id);
      setVisitors(prev => prev.filter(v => v.id !== id));
      toast.success('Visitante eliminado');
    } catch (e) {
      toast.error(e.message, 'Error al eliminar');
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck size={18} className="text-indigo-500" />
          <h4 className="font-bold text-slate-800 dark:text-slate-100">Visitantes autorizados (simple)</h4>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
        >
          <Plus size={13} />
          {showForm ? 'Cancelar' : 'Agregar'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="p-4 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Nombre completo"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">DNI (opcional)</label>
              <input
                type="text"
                value={form.docNumber}
                onChange={e => setForm(p => ({ ...p, docNumber: e.target.value }))}
                placeholder="Nº de documento"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
            Autorizar visitante
          </button>
        </form>
      )}

      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-brand-500" />
          </div>
        ) : visitors.length === 0 ? (
          <div className="p-8 text-center">
            <UserCheck size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-slate-400 dark:text-slate-500 text-sm">No tenés visitantes autorizados</p>
          </div>
        ) : (
          visitors.map(v => (
            <div key={v.id} className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {v.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{v.name}</p>
                {v.doc_number && <p className="text-xs text-slate-400 dark:text-slate-500">DNI: {v.doc_number}</p>}
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Desde: {new Date(v.authorized_date).toLocaleDateString('es-AR')}
                </p>
              </div>
              <button
                onClick={() => handleRemove(v.id)}
                disabled={removing === v.id}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60"
              >
                {removing === v.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Packages Section ─────────────────────────────────────────────────────────

function PackagesSection({ session, userProfile, isAdmin }) {
  const toast = useToast();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: '', unitId: '', userId: '' });
  const [saving, setSaving] = useState(false);
  const [delivering, setDelivering] = useState(null);

  useEffect(() => {
    fetchUserPackages(session.user.id, isAdmin)
      .then(setPackages)
      .catch(e => toast.error(e.message, 'Error al cargar encomiendas'))
      .finally(() => setLoading(false));
  }, [isAdmin, session.user.id, toast]);

  async function handleRegister(e) {
    e.preventDefault();
    if (!form.description.trim()) { toast.error('Ingresá una descripción'); return; }
    setSaving(true);
    try {
      const pkg = await createPackage({
        consortiumId: userProfile?.consortium_id,
        carrier: form.unitId.trim() || null,
        description: form.description.trim(),
        loggedBy: session.user.id,
      });
      setPackages(prev => [pkg, ...prev]);
      setForm({ description: '', unitId: '', userId: '' });
      setShowForm(false);
      toast.success('Encomienda registrada');
    } catch (e) {
      toast.error(e.message, 'Error al registrar encomienda');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeliver(id) {
    setDelivering(id);
    try {
      const updated = await collectPackage(id);
      setPackages(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
      toast.success('Entregado al propietario');
    } catch (e) {
      toast.error(e.message, 'Error al registrar entrega');
    } finally {
      setDelivering(null);
    }
  }

  const pending   = packages.filter(p => p.status !== 'collected');
  const delivered = packages.filter(p => p.status === 'collected');

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package size={18} className="text-amber-500" />
          <h4 className="font-bold text-slate-800 dark:text-slate-100">
            Encomiendas
            {pending.length > 0 && (
              <span className="ml-2 bg-amber-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {pending.length}
              </span>
            )}
          </h4>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
          >
            <Plus size={13} />
            {showForm ? 'Cancelar' : 'Registrar'}
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <form onSubmit={handleRegister} className="p-4 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Unidad / Destinatario</label>
              <input
                type="text"
                value={form.unitId}
                onChange={e => setForm(p => ({ ...p, unitId: e.target.value }))}
                placeholder="Ej: 3B"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Descripción</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Ej: Caja mediana, Amazon"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Package size={13} />}
            Registrar encomienda
          </button>
        </form>
      )}

      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-brand-500" />
          </div>
        ) : packages.length === 0 ? (
          <div className="p-8 text-center">
            <Package size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-slate-400 dark:text-slate-500 text-sm">No hay encomiendas registradas</p>
          </div>
        ) : (
          packages.map(pkg => (
            <div key={pkg.id} className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                pkg.status === 'collected' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
              }`}>
                {pkg.status === 'collected'
                  ? <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
                  : <Clock size={16} className="text-amber-600 dark:text-amber-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{pkg.description}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {isAdmin && pkg.carrier ? `Unidad ${pkg.carrier} · ` : ''}
                  Recibido: {formatDateTime(pkg.logged_at)}
                </p>
                {pkg.status === 'collected' && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    Entregado: {formatDateTime(pkg.collected_at)}
                  </p>
                )}
              </div>
              {isAdmin && pkg.status !== 'collected' && (
                <button
                  onClick={() => handleDeliver(pkg.id)}
                  disabled={delivering === pkg.id}
                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0"
                >
                  {delivering === pkg.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                  Entregar
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function AccessView({ session, userProfile }) {
  const isAdmin = userProfile?.role === 'admin';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-brand-600 to-brand-700 p-6 rounded-2xl text-white shadow-lg shadow-brand-500/20">
        <h3 className="text-xl font-bold flex items-center gap-2 mb-1">
          <DoorOpen size={22} />
          Accesos y Encomiendas
        </h3>
        <p className="text-brand-100 text-sm">
          {isAdmin
            ? 'Gestioná visitantes y encomiendas de todos los propietarios'
            : 'Pre-autorizá visitas y seguí tus encomiendas'
          }
        </p>
      </div>

      <PreAuthSection session={session} userProfile={userProfile} isAdmin={isAdmin} />
      <VisitorsSection session={session} userProfile={userProfile} isAdmin={isAdmin} />
      <PackagesSection session={session} userProfile={userProfile} isAdmin={isAdmin} />
    </div>
  );
}
