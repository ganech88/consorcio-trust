import { useState } from 'react';
import { User, Building, Phone, Mail, Shield, Edit3, Save, X } from 'lucide-react';
import { useToast } from './Toast';

export default function ProfileView({ session }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: 'Propietario Demo',
    phone: '',
    unit: '4° B',
    floor: '4',
    building: 'Torre Norte',
  });
  const toast = useToast();

  function handleSave() {
    setEditing(false);
    toast.success('Perfil actualizado correctamente');
  }

  function handleCancel() {
    setEditing(false);
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      {/* Header Card */}
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

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoCard icon={Building} label="Unidad" value={form.unit} />
        <InfoCard icon={Building} label="Edificio" value={form.building} />
        <InfoCard icon={User} label="Piso" value={form.floor} />
        <InfoCard icon={Phone} label="Teléfono" value={form.phone || 'No registrado'} muted={!form.phone} />
      </div>

      {/* Edit Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Edit3 size={18} className="text-blue-600" />
            Datos Personales
          </h3>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50"
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
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-100"
              >
                <Save size={16} /> Guardar
              </button>
              <button
                onClick={handleCancel}
                className="px-5 border border-slate-200 text-slate-600 py-2.5 rounded-xl font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <X size={16} /> Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/50">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Información de la cuenta</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">ID de usuario</span>
            <span className="text-slate-700 font-mono text-xs">{session.user.id.substring(0, 12)}...</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Email verificado</span>
            <span className="text-emerald-600 font-medium">Sí</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, muted }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
      <div className="bg-slate-50 p-2.5 rounded-lg">
        <Icon size={18} className="text-slate-400" />
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className={`text-sm font-semibold ${muted ? 'text-slate-300 italic' : 'text-slate-800'}`}>{value}</p>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, disabled, placeholder, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full px-4 py-2.5 border rounded-xl outline-none transition-all ${
          disabled
            ? 'bg-slate-50 border-slate-100 text-slate-600 cursor-default'
            : 'border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white'
        }`}
      />
      {hint && !disabled && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
