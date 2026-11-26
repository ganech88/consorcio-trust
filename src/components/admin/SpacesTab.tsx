import { useEffect, useState, type FormEvent } from 'react';
import { CalendarCheck, Plus, Loader2, Pencil, Eye, EyeOff, X, Check } from 'lucide-react';
import { fetchAmenities, createAmenity, updateAmenity, type Amenity } from '../../services/amenities.service';
import { useAppToast } from '../../lib/use-app-toast';
import { LoadingSpinner, EmptyState } from './shared';

// Espacios comunes que los vecinos pueden reservar (SUM, parrilla, etc.).
// Cada consorcio carga los suyos; los que no se usan se desactivan (no se borran,
// para no perder el historial de reservas).

const ICONS = ['🏢', '🍖', '🎉', '🏊', '💻', '🏋️', '🧺', '⚽', '🎾', '🌿', '🚗', '🧒'];
const SUGGESTIONS = [
  { name: 'SUM', icon: '🎉', description: 'Salón de usos múltiples' },
  { name: 'Parrilla', icon: '🍖', description: 'Parrilla con mesas' },
  { name: 'Pileta', icon: '🏊', description: '' },
  { name: 'Gimnasio', icon: '🏋️', description: '' },
  { name: 'Lavadero', icon: '🧺', description: '' },
];

const EMPTY = { name: '', description: '', capacity: '', icon: '🏢' };
const inputCls = 'w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none';
const labelCls = 'text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block';

export default function SpacesTab({ userProfile }: { userProfile: any }) {
  const toast = useAppToast();
  const cid: string | undefined = userProfile?.consortium_id;
  const [spaces, setSpaces] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!cid) { setLoading(false); return; }
    fetchAmenities(cid)
      .then(setSpaces)
      .catch((e: Error) => toast.error(e.message, 'No se pudieron cargar los espacios'))
      .finally(() => setLoading(false));
  }, [cid, toast]);

  function startEdit(space: Amenity) {
    setEditingId(space.id);
    setForm({
      name: space.name,
      description: space.description || '',
      capacity: space.capacity ? String(space.capacity) : '',
      icon: space.icon || '🏢',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ ...EMPTY });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!cid) return;
    const name = form.name.trim();
    if (!name) { toast.error('Poné el nombre del espacio (Ej: SUM, Parrilla)'); return; }
    const capacity = form.capacity === '' ? null : Number(form.capacity);
    if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 1000)) {
      toast.error('La capacidad tiene que ser un número entre 1 y 1000'); return;
    }
    if (spaces.some(s => s.id !== editingId && s.name.trim().toLowerCase() === name.toLowerCase())) {
      toast.error(`Ya hay un espacio llamado "${name}"`); return;
    }
    setSaving(true);
    try {
      const payload = { name, description: form.description, capacity, icon: form.icon };
      if (editingId) {
        const updated = await updateAmenity(editingId, payload);
        setSpaces(prev => prev.map(s => (s.id === updated.id ? updated : s)));
        toast.success('Espacio actualizado');
      } else {
        const created = await createAmenity(cid, payload);
        setSpaces(prev => [...prev, created]);
        toast.success(`"${created.name}" ya se puede reservar`);
      }
      cancelEdit();
    } catch (err) {
      toast.error((err as Error).message, 'No se pudo guardar el espacio');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(space: Amenity) {
    setBusyId(space.id);
    try {
      const updated = await updateAmenity(space.id, { active: !space.active });
      setSpaces(prev => prev.map(s => (s.id === updated.id ? updated : s)));
      toast.success(updated.active ? `"${updated.name}" vuelve a estar disponible` : `"${updated.name}" ya no se puede reservar`);
    } catch (err) {
      toast.error((err as Error).message, 'No se pudo actualizar el espacio');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-5 space-y-4">
        <div>
          <h4 className="font-bold text-slate-800 dark:text-ink-hi text-sm flex items-center gap-2">
            <CalendarCheck size={16} className="text-brand-500" />
            {editingId ? 'Editar espacio' : 'Agregar un espacio común'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-ink-mid mt-1">
            Son los lugares que los vecinos pueden reservar por turno. Las reservas te llegan para aprobar en "Reservas".
          </p>
        </div>

        {!editingId && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.filter(sg => !spaces.some(s => s.name.toLowerCase() === sg.name.toLowerCase())).map(sg => (
              <button
                key={sg.name}
                type="button"
                onClick={() => setForm(f => ({ ...f, name: sg.name, icon: sg.icon, description: f.description || sg.description }))}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/[0.09] text-slate-600 dark:text-ink-mid hover:border-brand-300 dark:hover:border-brand-500 transition-colors"
              >
                {sg.icon} {sg.name}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="space-name">Nombre *</label>
            <input id="space-name" className={inputCls} value={form.name} maxLength={60}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: SUM, Parrilla del 9° piso" />
          </div>
          <div>
            <label className={labelCls} htmlFor="space-capacity">Capacidad (personas)</label>
            <input id="space-capacity" className={inputCls} type="number" min={1} max={1000} inputMode="numeric" value={form.capacity}
              onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="Opcional" />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="space-description">Descripción o reglas de uso</label>
          <input id="space-description" className={inputCls} value={form.description} maxLength={200}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ej: Se entrega limpio. Música hasta las 24 h." />
        </div>
        <div>
          <span className={labelCls}>Ícono</span>
          <div className="flex flex-wrap gap-1.5">
            {ICONS.map(ic => (
              <button
                key={ic}
                type="button"
                onClick={() => setForm(f => ({ ...f, icon: ic }))}
                aria-label={`Ícono ${ic}`}
                aria-pressed={form.icon === ic}
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center border transition-colors ${
                  form.icon === ic
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-400/[0.14]'
                    : 'border-slate-200 dark:border-white/[0.09] hover:border-brand-300'
                }`}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors">
            {saving ? <Loader2 size={16} className="animate-spin" /> : editingId ? <Check size={16} /> : <Plus size={16} />}
            {editingId ? 'Guardar cambios' : 'Agregar espacio'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit}
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-ink-mid px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06]">
              <X size={16} /> Cancelar
            </button>
          )}
        </div>
      </form>

      {spaces.length === 0 ? (
        <EmptyState icon={CalendarCheck} text="Todavía no cargaste espacios. Si tu edificio no tiene ninguno, podés ocultar Reservas desde Consorcio → Secciones visibles." />
      ) : (
        <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] divide-y divide-slate-100 dark:divide-white/[0.06]">
          {spaces.map(space => (
            <div key={space.id} className={`p-4 flex items-center gap-3 ${space.active ? '' : 'opacity-60'}`}>
              <span className="text-2xl shrink-0" aria-hidden="true">{space.icon || '🏢'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-ink-hi text-sm truncate">
                  {space.name}
                  {!space.active && <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">No disponible</span>}
                </p>
                <p className="text-xs text-slate-500 dark:text-ink-mid truncate">
                  {[space.capacity ? `Hasta ${space.capacity} personas` : null, space.description].filter(Boolean).join(' · ') || 'Sin descripción'}
                </p>
              </div>
              <button type="button" onClick={() => startEdit(space)}
                className="p-2 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                aria-label={`Editar ${space.name}`}>
                <Pencil size={16} />
              </button>
              <button type="button" onClick={() => toggleActive(space)} disabled={busyId === space.id}
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.09] text-slate-600 dark:text-ink-mid hover:bg-slate-50 dark:hover:bg-white/[0.06] disabled:opacity-60 shrink-0">
                {busyId === space.id ? <Loader2 size={13} className="animate-spin" /> : space.active ? <EyeOff size={13} /> : <Eye size={13} />}
                {space.active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
