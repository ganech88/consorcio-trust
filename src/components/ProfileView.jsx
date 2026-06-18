import { useState, useEffect } from 'react';
import { User, Building, Phone, Mail, Shield, Edit3, Save, X, LogOut } from 'lucide-react';
import { useToast } from './Toast';
import { updateProfile } from '../services/data.service';

export default function ProfileView({ session, userProfile, onProfileUpdate, onLogout }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: 'Propietario',
    phone: '',
    unit: '—',
    floor: '—',
    building: '—',
  });
  const toast = useToast();

  useEffect(() => {
    if (userProfile) {
      setForm({
        fullName: userProfile.full_name || 'Propietario',
        phone: userProfile.phone || '',
        unit: userProfile.unit_id || '—',
        floor: '—',
        building: '—',
      });
    }
  }, [userProfile]);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateProfile(session.user.id, {
        full_name: form.fullName,
        phone: form.phone,
      });
      if (onProfileUpdate && updated) {
        onProfileUpdate(updated);
      }
      setEditing(false);
      toast.success('Perfil actualizado correctamente');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('No se pudo actualizar el perfil. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (userProfile) {
      setForm({
        fullName: userProfile.full_name || 'Propietario',
        phone: userProfile.phone || '',
        unit: userProfile.unit_id || '—',
        floor: '—',
        building: '—',
      });
    }
    setEditing(false);
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-8 rounded-2xl text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="relative flex items-center gap-5">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl font-bold shadow-lg shadow-blue-500/30">
            {session.user.email.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{form.fullName}</h2>
            <p className="text-slate-300 text-sm mt-1 flex items-center gap-1.5">
              <Mail size={14} />
              {session.user.email}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <Shield size={12} />
                Propietario
              </span>
              <span className="bg-blue-500/20 text-blue-300 text-xs font-bold px-2.5 py-1 rounded-full">
                {form.unit}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoCard icon={Building} label="Unidad" value={form.unit} />
        <InfoCard icon={Building} label="Edificio" value={form.building} />
        <InfoCard icon={User} label="Piso" value={form.floor} />
        <InfoCard icon={Phone} label="Teléfono" value={form.phone || 'No registrado'} muted={!form.phone} />
      </div>

      <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-white/[0.07] flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-ink-hi flex items-center gap-2">
            <Edit3 size={18} className="text-blue-600 dark:text-brand-400" />
            Datos Personales
          </h3>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-blue-600 dark:text-brand-400 font-medium hover:text-blue-700 dark:hover:text-blue-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30"
            >
              Editar
            </button>
          )}
        </div>

        <div className="p-5 space-y-4">
          <FormField
            label="Nombre completo"
            value={form.fullName}
            onChange={(v) => setForm({ ...form, fullName: v })}
            disabled={!editing}
          />
          <FormField
            label="Teléfono (WhatsApp)"
            value={form.phone}
            onChange={(v) => setForm({ ...form, phone: v })}
            disabled={!editing}
            placeholder="Ej: 11 3274-9508"
            hint="Se usa para recibir notificaciones y usar el bot de WhatsApp"
          />

          {editing && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-100 dark:shadow-blue-900/30 disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={handleCancel}
                className="px-5 border border-slate-200 dark:border-white/[0.09] text-slate-600 dark:text-ink-mid py-2.5 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-colors flex items-center gap-2"
              >
                <X size={16} /> Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-surface-panel/70 rounded-2xl p-5 border border-slate-200/50 dark:border-white/[0.07]">
        <h4 className="text-xs font-bold text-slate-400 dark:text-ink-low uppercase tracking-wider mb-3">Información de la cuenta</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-ink-mid">ID de usuario</span>
            <span className="text-slate-700 dark:text-ink-mid font-mono text-xs">{session.user.id.substring(0, 12)}...</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-ink-mid">Email verificado</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Sí</span>
          </div>
        </div>
      </div>

      {onLogout && (
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-red-200 dark:border-red-900/50 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold text-sm transition-colors"
        >
          <LogOut size={16} />
          Cerrar Sesión
        </button>
      )}
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, muted }) {
  return (
    <div className="bg-white dark:bg-surface-panel p-4 rounded-xl border border-slate-100 dark:border-white/[0.07] flex items-center gap-3">
      <div className="bg-slate-50 dark:bg-surface-panel2 p-2.5 rounded-lg">
        <Icon size={18} className="text-slate-400 dark:text-ink-low" />
      </div>
      <div>
        <p className="text-xs text-slate-400 dark:text-ink-low font-medium">{label}</p>
        <p className={`text-sm font-semibold ${muted ? 'text-slate-300 dark:text-ink-low italic' : 'text-slate-800 dark:text-ink-hi'}`}>{value}</p>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, disabled, placeholder, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-ink-mid mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full px-4 py-2.5 border rounded-xl outline-none transition-all ${
          disabled
            ? 'bg-slate-50 dark:bg-surface-panel2 border-slate-100 dark:border-white/[0.09] text-slate-600 dark:text-ink-mid cursor-default'
            : 'border-slate-200 dark:border-white/[0.09] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-surface-panel2 dark:text-ink-hi'
        }`}
      />
      {hint && !disabled && <p className="text-xs text-slate-400 dark:text-ink-low mt-1">{hint}</p>}
    </div>
  );
}
