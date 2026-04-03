import { useState, useEffect, useCallback } from 'react';
import { PackageSearch, Plus, CheckCircle, Clock, Loader2, Package } from 'lucide-react';
import {
  fetchUserPackages, createPackage, collectPackage,
} from '../services/data.service';
import { useToast } from './Toast';
import { supabase } from '../lib/supabase';

function formatDateTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function AdminForm({ session, userProfile, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ carrier: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.description.trim()) { toast.error('Ingresá una descripción'); return; }
    setSaving(true);
    try {
      const pkg = await createPackage({
        consortiumId: userProfile?.consortium_id,
        carrier: form.carrier.trim() || null,
        description: form.description.trim(),
        loggedBy: session.user.id,
      });
      onCreated(pkg);
      setForm({ carrier: '', description: '' });
      setShowForm(false);
      toast.success('Paquete registrado');
    } catch (e) {
      toast.error(e.message, 'Error al registrar paquete');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-b border-slate-100 dark:border-slate-700">
      <div className="p-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Panel administrador</p>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
        >
          <Plus size={13} />
          {showForm ? 'Cancelar' : 'Registrar paquete'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3 bg-slate-50 dark:bg-slate-700/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Transportista</label>
              <input
                type="text"
                value={form.carrier}
                onChange={e => setForm(p => ({ ...p, carrier: e.target.value }))}
                placeholder="Ej: Andreani, OCA..."
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Descripción *</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Ej: Caja grande, MercadoLibre"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Package size={13} />}
            Registrar paquete
          </button>
        </form>
      )}
    </div>
  );
}

export default function PackagesView({ session, userProfile }) {
  const toast = useToast();
  const isAdmin = userProfile?.role === 'admin';
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(null);

  const loadPackages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUserPackages(session.user.id, isAdmin);
      setPackages(data);
    } catch (e) {
      toast.error(e.message, 'Error al cargar paquetes');
    } finally {
      setLoading(false);
    }
  }, [session.user.id, isAdmin, toast]);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('packages-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'packages' }, () => {
        loadPackages();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [loadPackages]);

  async function handleCollect(id) {
    setCollecting(id);
    try {
      const updated = await collectPackage(id);
      setPackages(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
      toast.success('Paquete marcado como retirado');
    } catch (e) {
      toast.error(e.message, 'Error al actualizar');
    } finally {
      setCollecting(null);
    }
  }

  const pending   = packages.filter(p => p.status !== 'collected');
  const collected = packages.filter(p => p.status === 'collected');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-700 p-6 rounded-2xl text-white shadow-lg shadow-brand-500/20">
        <h3 className="text-xl font-bold flex items-center gap-2 mb-1">
          <PackageSearch size={24} />
          Paquetería
        </h3>
        <p className="text-brand-100 text-sm">
          {isAdmin ? 'Registrá y gestioná los paquetes del consorcio' : 'Seguí el estado de tus paquetes'}
        </p>
      </div>

      {/* Pending packages */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-amber-500" />
            <h4 className="font-bold text-slate-800 dark:text-slate-100">
              Paquetes pendientes
              {pending.length > 0 && (
                <span className="ml-2 bg-amber-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {pending.length}
                </span>
              )}
            </h4>
          </div>
        </div>

        {isAdmin && (
          <AdminForm session={session} userProfile={userProfile} onCreated={pkg => setPackages(prev => [pkg, ...prev])} />
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className="animate-spin text-brand-500" />
          </div>
        ) : pending.length === 0 ? (
          <div className="p-10 text-center text-slate-400 dark:text-slate-500">
            <PackageSearch size={40} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay paquetes pendientes</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {pending.map(pkg => (
              <div key={pkg.id} className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center shrink-0">
                  <Package size={18} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{pkg.description}</p>
                  {pkg.carrier && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">via {pkg.carrier}</p>
                  )}
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Registrado: {formatDateTime(pkg.logged_at || pkg.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => handleCollect(pkg.id)}
                  disabled={collecting === pkg.id}
                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0"
                >
                  {collecting === pkg.id
                    ? <Loader2 size={12} className="animate-spin" />
                    : <CheckCircle size={12} />
                  }
                  Retiré mi paquete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Collected packages */}
      {collected.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-500" />
            <h4 className="font-bold text-slate-800 dark:text-slate-100">Retirados</h4>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {collected.map(pkg => (
              <div key={pkg.id} className="p-4 flex items-start gap-3 opacity-70">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center shrink-0">
                  <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{pkg.description}</p>
                  {pkg.carrier && <p className="text-xs text-slate-400 dark:text-slate-500">via {pkg.carrier}</p>}
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Retirado: {formatDateTime(pkg.collected_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
