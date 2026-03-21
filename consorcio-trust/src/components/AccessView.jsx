import { useState, useEffect } from 'react';
import { Package, UserCheck, Plus, Trash2, Loader2, CheckCircle, Clock } from 'lucide-react';
import {
  fetchVisitors, addVisitor, removeVisitor,
  fetchPackages, fetchAllPackages, registerPackage, deliverPackage,
} from '../services/data.service';
import { useToast } from './Toast';

function formatDateTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

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
          <h4 className="font-bold text-slate-800 dark:text-slate-100">Visitantes autorizados</h4>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
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
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
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
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
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
            <Loader2 size={24} className="animate-spin text-blue-500" />
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
                {v.doc_number && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">DNI: {v.doc_number}</p>
                )}
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Desde: {new Date(v.authorized_date).toLocaleDateString('es-AR')}
                </p>
              </div>
              <button
                onClick={() => handleRemove(v.id)}
                disabled={removing === v.id}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60"
                title="Eliminar"
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

function PackagesSection({ session, userProfile, isAdmin }) {
  const toast = useToast();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: '', unitId: '', userId: '' });
  const [saving, setSaving] = useState(false);
  const [delivering, setDelivering] = useState(null);

  useEffect(() => {
    const fetcher = isAdmin ? fetchAllPackages : fetchPackages;
    const arg = isAdmin ? undefined : session.user.id;
    fetcher(arg)
      .then(setPackages)
      .catch(e => toast.error(e.message, 'Error al cargar encomiendas'))
      .finally(() => setLoading(false));
  }, [isAdmin, session.user.id, toast]);

  async function handleRegister(e) {
    e.preventDefault();
    if (!form.description.trim()) { toast.error('Ingresá una descripción'); return; }
    setSaving(true);
    try {
      const pkg = await registerPackage({
        unitId: isAdmin ? (form.unitId.trim() || 'N/A') : (userProfile?.unit_id ?? ''),
        userId: isAdmin ? (form.userId || null) : session.user.id,
        description: form.description.trim(),
        consortiumId: userProfile?.consortium_id,
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
      const updated = await deliverPackage(id);
      setPackages(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
      toast.success('Entregado al propietario');
    } catch (e) {
      toast.error(e.message, 'Error al registrar entrega');
    } finally {
      setDelivering(null);
    }
  }

  const pending = packages.filter(p => !p.delivered_at);
  const delivered = packages.filter(p => p.delivered_at);

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
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
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
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Unidad</label>
              <input
                type="text"
                value={form.unitId}
                onChange={e => setForm(p => ({ ...p, unitId: e.target.value }))}
                placeholder="Ej: 3B"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Descripción</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Ej: Caja mediana, Amazon"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
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
            <Loader2 size={24} className="animate-spin text-blue-500" />
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
                pkg.delivered_at
                  ? 'bg-emerald-100 dark:bg-emerald-900/30'
                  : 'bg-amber-100 dark:bg-amber-900/30'
              }`}>
                {pkg.delivered_at
                  ? <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
                  : <Clock size={16} className="text-amber-600 dark:text-amber-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{pkg.description}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {isAdmin && pkg.unit_id ? `Unidad ${pkg.unit_id} · ` : ''}
                  Recibido: {formatDateTime(pkg.received_at)}
                </p>
                {pkg.delivered_at && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    Entregado: {formatDateTime(pkg.delivered_at)}
                  </p>
                )}
              </div>
              {isAdmin && !pkg.delivered_at && (
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
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-2xl text-white shadow-lg">
        <h3 className="text-xl font-bold flex items-center gap-2 mb-1">
          <Package size={22} />
          Accesos y Encomiendas
        </h3>
        <p className="text-indigo-100 text-sm">
          {isAdmin
            ? 'Gestioná visitantes y encomiendas de todos los propietarios'
            : 'Autorizá visitantes y seguí tus encomiendas'
          }
        </p>
      </div>

      <VisitorsSection session={session} userProfile={userProfile} isAdmin={isAdmin} />
      <PackagesSection session={session} userProfile={userProfile} isAdmin={isAdmin} />
    </div>
  );
}
