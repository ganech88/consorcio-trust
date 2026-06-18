import { useState, useEffect } from 'react';
import {
  Building2, Check, Copy, RefreshCw, Loader2, Users, Bell, Save,
  CreditCard as MpIcon,
} from 'lucide-react';
import {
  updateConsortium, fetchConsortiumMembers,
  regenerateInviteCode, updateReminderSettings,
  fetchMpConfig, saveMpConfig,
} from '../../services/data.service';
import { useToast } from '../Toast';
import { LoadingSpinner } from './shared';

export default function ConsorcioTab({ userProfile }) {
  const toast = useToast();
  const [consortium, setConsortium] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', city: '' });
  const [reminderForm, setReminderForm] = useState({ enabled: false, days_before: 3, days_after: 2 });
  const [savingReminder, setSavingReminder] = useState(false);
  const [mpForm, setMpForm] = useState({ access_token: '', public_key: '', enabled: false, hasToken: false });
  const [savingMp, setSavingMp] = useState(false);

  useEffect(() => {
    if (!userProfile?.consortium_id) { setLoading(false); return; }
    Promise.all([
      import('../../services/data.service').then(m => m.fetchConsortium(userProfile.consortium_id)),
      fetchConsortiumMembers(userProfile.consortium_id),
      fetchMpConfig(userProfile.consortium_id),
    ]).then(([c, m, mp]) => {
      if (c) {
        setConsortium(c);
        setForm({ name: c.name || '', address: c.address || '', city: c.city || '' });
        setReminderForm({
          enabled: c.reminder_enabled ?? false,
          days_before: c.reminder_days_before_due ?? 3,
          days_after: c.reminder_days_after_due ?? 2,
        });
      }
      setMembers(m);
      if (mp) {
        setMpForm({ access_token: '', public_key: mp.public_key || '', enabled: mp.enabled ?? false, hasToken: !!mp.id });
      }
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

  async function handleSaveReminder(e) {
    e.preventDefault();
    setSavingReminder(true);
    try {
      await updateReminderSettings(userProfile.consortium_id, {
        reminder_enabled: reminderForm.enabled,
        reminder_days_before_due: Number(reminderForm.days_before),
        reminder_days_after_due: Number(reminderForm.days_after),
      });
      toast.success('Configuración de recordatorios guardada');
    } catch (err) {
      toast.error(err.message, 'Error al guardar');
    } finally {
      setSavingReminder(false);
    }
  }

  async function handleSaveMp(e) {
    e.preventDefault();
    if (!mpForm.hasToken && !mpForm.access_token.trim()) { toast.error('El Access Token es requerido'); return; }
    setSavingMp(true);
    try {
      const config = {
        public_key: mpForm.public_key.trim() || null,
        enabled: mpForm.enabled,
      };
      if (mpForm.access_token.trim()) {
        config.access_token = mpForm.access_token.trim();
      }
      await saveMpConfig(userProfile.consortium_id, config);
      setMpForm(prev => ({ ...prev, access_token: '', hasToken: true }));
      toast.success('Configuración MercadoPago guardada');
    } catch (err) {
      toast.error(err.message, 'Error al guardar');
    } finally {
      setSavingMp(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Editar datos */}
      <form onSubmit={handleSave} className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-5 space-y-4">
        <h4 className="font-bold text-slate-800 dark:text-ink-hi text-sm flex items-center gap-2">
          <Building2 size={16} className="text-brand-600" />
          Datos del Consorcio
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">Dirección</label>
            <input
              type="text"
              value={form.address}
              onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">Ciudad</label>
            <input
              type="text"
              value={form.city}
              onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
              className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none"
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
        <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-5">
          <h4 className="font-bold text-slate-800 dark:text-ink-hi text-sm mb-3">Código de Invitación</h4>
          <p className="text-xs text-slate-500 dark:text-ink-mid mb-3">
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
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/[0.14] dark:text-emerald-400'
                  : 'bg-slate-100 dark:bg-surface-panel2 text-slate-600 dark:text-ink-mid hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-600'
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              title="Regenerar código"
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all bg-slate-100 dark:bg-surface-panel2 text-slate-600 dark:text-ink-mid hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-accent-600 disabled:opacity-60"
            >
              {regenerating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Regenerar
            </button>
          </div>
        </div>
      )}

      {/* Recordatorios de deuda */}
      <form onSubmit={handleSaveReminder} className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-5 space-y-4">
        <h4 className="font-bold text-slate-800 dark:text-ink-hi text-sm flex items-center gap-2">
          <Bell size={16} className="text-amber-500" />
          Recordatorios automáticos de deuda
        </h4>
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setReminderForm(p => ({ ...p, enabled: !p.enabled }))}
            className={`relative w-10 h-5 rounded-full transition-colors ${reminderForm.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-surface-panel2'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${reminderForm.enabled ? 'translate-x-5' : ''}`} />
          </div>
          <span className="text-sm text-slate-700 dark:text-ink-mid">
            {reminderForm.enabled ? 'Activado' : 'Desactivado'}
          </span>
        </label>
        {reminderForm.enabled && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">
                Días antes del vencimiento
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={reminderForm.days_before}
                onChange={e => setReminderForm(p => ({ ...p, days_before: e.target.value }))}
                className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">
                Días después del vencimiento
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={reminderForm.days_after}
                onChange={e => setReminderForm(p => ({ ...p, days_after: e.target.value }))}
                className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>
        )}
        <button
          type="submit"
          disabled={savingReminder}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          {savingReminder ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Guardar recordatorios
        </button>
      </form>

      {/* MercadoPago */}
      <form onSubmit={handleSaveMp} className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-5 space-y-4">
        <h4 className="font-bold text-slate-800 dark:text-ink-hi text-sm flex items-center gap-2">
          <MpIcon size={16} className="text-sky-500" />
          Integración MercadoPago
        </h4>
        <p className="text-xs text-slate-500 dark:text-ink-mid">
          Permite que los residentes paguen sus expensas online con tarjeta, transferencia o efectivo.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">Access Token</label>
            <input
              type="password"
              value={mpForm.access_token}
              onChange={e => setMpForm(p => ({ ...p, access_token: e.target.value }))}
              placeholder="APP_USR-..."
              className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-sky-500 outline-none font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">Public Key</label>
            <input
              type="text"
              value={mpForm.public_key}
              onChange={e => setMpForm(p => ({ ...p, public_key: e.target.value }))}
              placeholder="APP_USR-..."
              className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-sky-500 outline-none font-mono"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setMpForm(p => ({ ...p, enabled: !p.enabled }))}
              className={`relative w-10 h-5 rounded-full transition-colors ${mpForm.enabled ? 'bg-sky-500' : 'bg-slate-300 dark:bg-surface-panel2'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${mpForm.enabled ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm text-slate-700 dark:text-ink-mid">
              {mpForm.enabled ? 'Habilitado para residentes' : 'Deshabilitado'}
            </span>
          </label>
        </div>
        <button
          type="submit"
          disabled={savingMp}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          {savingMp ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Guardar MercadoPago
        </button>
      </form>

      {/* Lista de miembros */}
      <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-white/[0.07]">
          <h4 className="font-bold text-slate-800 dark:text-ink-hi text-sm flex items-center gap-2">
            <Users size={16} className="text-slate-400" />
            Miembros ({members.length})
          </h4>
        </div>
        {members.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-ink-low text-center py-8">Sin miembros registrados</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors">
                <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-400/[0.14] flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                    {(m.full_name || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-ink-hi truncate">{m.full_name || 'Sin nombre'}</p>
                  {m.unit_id && <p className="text-xs text-slate-400 dark:text-ink-low">Unidad {m.unit_id}</p>}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  m.role === 'admin'
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-400/[0.14] dark:text-brand-400'
                    : 'bg-slate-100 text-slate-600 dark:bg-surface-panel2 dark:text-ink-mid'
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
