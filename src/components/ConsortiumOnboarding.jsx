import { useState } from 'react';
import { Building2, KeyRound, Plus, ArrowRight, Loader2 } from 'lucide-react';
import { joinConsortiumByCode, createConsortiumForUser } from '../services/data.service';
import { useToast } from './Toast';
import Logo from './Logo';

export default function ConsortiumOnboarding({ session, onComplete }) {
  const [mode, setMode] = useState(null); // 'join' | 'create'
  const [inviteCode, setInviteCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function handleJoin(e) {
    e.preventDefault();
    if (!inviteCode.trim()) { toast.error('Ingresá el código de invitación'); return; }
    setLoading(true);
    try {
      const consortium = await joinConsortiumByCode(inviteCode, session.user.id);
      toast.success(`Te uniste a "${consortium.name}"`);
      onComplete();
    } catch (err) {
      toast.error(err.message, 'Error al unirse');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) { toast.error('Ingresá el nombre del consorcio'); return; }
    setLoading(true);
    try {
      const consortium = await createConsortiumForUser(name, address, city, session.user.id);
      toast.success(`Consorcio "${consortium.name}" creado`);
      onComplete();
    } catch (err) {
      toast.error(err.message, 'Error al crear consorcio');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-700/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-white/95 dark:bg-surface-panel/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-white/[0.07]/50 p-8">
        <div className="flex items-center gap-3 mb-6">
          <Logo size={36} />
          <span className="font-bold text-xl text-slate-800 dark:text-ink-hi">ConsorcioTrust</span>
        </div>

        <h2 className="text-2xl font-bold text-slate-800 dark:text-ink-hi mb-1">Configurá tu consorcio</h2>
        <p className="text-slate-500 dark:text-ink-mid text-sm mb-6">
          Para empezar, unite a un consorcio existente o creá uno nuevo.
        </p>

        {!mode && (
          <div className="space-y-3">
            <button
              onClick={() => setMode('join')}
              className="w-full flex items-center gap-4 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-2xl p-4 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shrink-0">
                <KeyRound size={20} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-ink-hi text-sm">Tengo un código de invitación</p>
                <p className="text-xs text-slate-500 dark:text-ink-mid mt-0.5">Unirme a un consorcio existente</p>
              </div>
              <ArrowRight size={16} className="ml-auto text-slate-400 shrink-0" />
            </button>

            <button
              onClick={() => setMode('create')}
              className="w-full flex items-center gap-4 bg-slate-50 dark:bg-surface-inset border border-slate-200 dark:border-white/[0.09] rounded-2xl p-4 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors text-left"
            >
              <div className="w-10 h-10 bg-slate-600 dark:bg-slate-500 rounded-xl flex items-center justify-center shrink-0">
                <Plus size={20} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-ink-hi text-sm">Crear nuevo consorcio</p>
                <p className="text-xs text-slate-500 dark:text-ink-mid mt-0.5">Seré administrador del consorcio</p>
              </div>
              <ArrowRight size={16} className="ml-auto text-slate-400 shrink-0" />
            </button>
          </div>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className="space-y-4">
            <button
              type="button"
              onClick={() => setMode(null)}
              className="text-sm text-brand-600 dark:text-brand-400 hover:underline mb-2"
            >
              ← Volver
            </button>
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">
                Código de invitación
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                placeholder="Ej: a1b2c3d4"
                className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-4 py-3 text-sm bg-slate-50 dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none font-mono tracking-widest"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
              Unirme al consorcio
            </button>
          </form>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4">
            <button
              type="button"
              onClick={() => setMode(null)}
              className="text-sm text-brand-600 dark:text-brand-400 hover:underline mb-2"
            >
              ← Volver
            </button>
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">
                Nombre del consorcio *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Consorcio Av. Corrientes 1234"
                className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-4 py-3 text-sm bg-slate-50 dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">
                Dirección
              </label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Ej: Av. Corrientes 1234"
                className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-4 py-3 text-sm bg-slate-50 dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">
                Ciudad
              </label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Ej: Buenos Aires"
                className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-4 py-3 text-sm bg-slate-50 dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Building2 size={18} />}
              Crear consorcio
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
