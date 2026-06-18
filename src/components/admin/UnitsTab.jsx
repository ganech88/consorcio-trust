import { useState, useEffect, useMemo } from 'react';
import { Home, Plus, Loader2, Save, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { fetchUnits, createUnit, updateUnit, deleteUnit } from '../../services/units.service';
import { fetchConsortiumMembers } from '../../services/data.service';
import { useToast } from '../Toast';
import { LoadingSpinner, EmptyState } from './shared';

export default function UnitsTab({ userProfile }) {
  const toast = useToast();
  const [units, setUnits] = useState([]);
  const [owners, setOwners] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [edited, setEdited] = useState({}); // { unitId: coefficientString }
  const [form, setForm] = useState({ name: '', floor: '', apartment: '', coefficient: '' });

  useEffect(() => {
    const cid = userProfile?.consortium_id;
    Promise.all([fetchUnits(cid), fetchConsortiumMembers(cid)])
      .then(([u, members]) => {
        setUnits(u);
        setOwners(Object.fromEntries((members || []).map(m => [m.id, m.full_name])));
      })
      .catch(e => toast.error(e.message, 'Error al cargar unidades'))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, toast]);

  // Suma de coeficientes (usando el valor editado si existe)
  const sum = useMemo(() => units.reduce((acc, u) => {
    const raw = edited[u.id] !== undefined ? edited[u.id] : u.coefficient;
    const n = Number(raw);
    return acc + (isNaN(n) ? 0 : n);
  }, 0), [units, edited]);
  const sumOk = Math.abs(sum - 100) < 0.5;
  const hasChanges = Object.keys(edited).length > 0;

  async function handleSaveCoefficients() {
    const changed = units.filter(u => {
      const v = edited[u.id];
      return v !== undefined && Number(v) !== Number(u.coefficient ?? NaN);
    });
    if (changed.length === 0) { toast.error('No hay cambios para guardar'); return; }
    const invalido = changed.find(u => { const v = Number(edited[u.id]); return edited[u.id] !== '' && (isNaN(v) || v < 0); });
    if (invalido) { toast.error('Los coeficientes deben ser números mayores o iguales a 0'); return; }
    setSaving(true);
    try {
      await Promise.all(changed.map(u =>
        updateUnit(u.id, { coefficient: edited[u.id] === '' ? null : Number(edited[u.id]) })
      ));
      setUnits(prev => prev.map(u => edited[u.id] !== undefined
        ? { ...u, coefficient: edited[u.id] === '' ? null : Number(edited[u.id]) }
        : u));
      setEdited({});
      toast.success(`Coeficientes guardados (${changed.length})`);
    } catch (e) {
      toast.error(e.message, 'Error al guardar coeficientes');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Ingresá el nombre/etiqueta de la unidad (Ej: 2A)'); return; }
    if (form.coefficient !== '' && (isNaN(Number(form.coefficient)) || Number(form.coefficient) < 0)) {
      toast.error('El coeficiente debe ser un número mayor o igual a 0'); return;
    }
    setSaving(true);
    try {
      const unit = await createUnit(userProfile?.consortium_id, {
        name: form.name.trim(),
        floor: form.floor.trim() || null,
        apartment: form.apartment.trim() || null,
        coefficient: form.coefficient ? Number(form.coefficient) : null,
        balance: 0,
      });
      setUnits(prev => [...prev, unit].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      setForm({ name: '', floor: '', apartment: '', coefficient: '' });
      toast.success('Unidad creada');
    } catch (e) {
      toast.error(e.message, 'Error al crear unidad');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await deleteUnit(id);
      setUnits(prev => prev.filter(u => u.id !== id));
      toast.success('Unidad eliminada');
    } catch (e) {
      toast.error(e.message, 'Error al eliminar (¿tiene datos asociados?)');
    } finally {
      setDeleting(null);
    }
  }

  const inputCls = 'w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none';
  const labelCls = 'text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block';

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Alta de unidad */}
      <form onSubmit={handleCreate} className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-5 space-y-4">
        <h4 className="font-bold text-slate-800 dark:text-ink-hi text-sm flex items-center gap-2">
          <Home size={16} className="text-brand-500" />
          Agregar unidad
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>Etiqueta</label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="2A" className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Piso</label>
            <input type="text" value={form.floor} onChange={e => setForm(p => ({ ...p, floor: e.target.value }))} placeholder="2" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Depto</label>
            <input type="text" value={form.apartment} onChange={e => setForm(p => ({ ...p, apartment: e.target.value }))} placeholder="A" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Coeficiente %</label>
            <input type="number" min="0" step="0.0001" value={form.coefficient} onChange={e => setForm(p => ({ ...p, coefficient: e.target.value }))} placeholder="0.85" className={inputCls} />
          </div>
        </div>
        <button type="submit" disabled={saving} className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-[#04201d] px-4 py-2 rounded-xl text-sm font-bold transition-colors">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Agregar unidad
        </button>
      </form>

      {/* Indicador de suma de coeficientes */}
      <div className={`flex items-center justify-between rounded-2xl border p-4 ${
        sumOk
          ? 'bg-emerald-50 dark:bg-emerald-400/[0.10] border-emerald-200 dark:border-emerald-800'
          : 'bg-amber-50 dark:bg-amber-400/[0.10] border-amber-200 dark:border-amber-800'
      }`}>
        <div className="flex items-center gap-2">
          {sumOk ? <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" /> : <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />}
          <div>
            <p className={`text-sm font-bold ${sumOk ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
              Suma de coeficientes: <span className="font-mono">{sum.toFixed(2)}%</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-ink-mid">
              {sumOk ? 'Correcto: la suma da 100%.' : 'Debería sumar 100%. Ajustá los coeficientes.'}
            </p>
          </div>
        </div>
        {hasChanges && (
          <button onClick={handleSaveCoefficients} disabled={saving} className="flex items-center gap-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-[#04201d] px-4 py-2 rounded-xl text-sm font-bold transition-colors shrink-0">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Guardar coeficientes
          </button>
        )}
      </div>

      {/* Lista de unidades */}
      {units.length === 0 ? (
        <EmptyState icon={Home} text="No hay unidades. Agregá las unidades del edificio con su coeficiente." />
      ) : (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-400 dark:text-ink-low uppercase tracking-wider px-1">
            Unidades ({units.length})
          </h4>
          {units.map(u => (
            <div key={u.id} className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-brand-100 dark:bg-brand-400/[0.14] rounded-xl flex items-center justify-center shrink-0">
                <Home size={18} className="text-brand-600 dark:text-brand-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-ink-hi">Unidad {u.name}</p>
                <p className="text-xs text-slate-400 dark:text-ink-low truncate">
                  {u.owner_id ? (owners[u.owner_id] || 'Propietario asignado') : 'Sin propietario'}
                </p>
              </div>
              <div className="shrink-0 w-28">
                <div className="relative">
                  <input
                    type="number" min="0" step="0.0001"
                    value={edited[u.id] !== undefined ? edited[u.id] : (u.coefficient ?? '')}
                    onChange={e => setEdited(prev => ({ ...prev, [u.id]: e.target.value }))}
                    placeholder="0.00"
                    className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl pl-3 pr-7 py-2 text-sm text-right font-mono bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                </div>
              </div>
              <button onClick={() => handleDelete(u.id)} disabled={deleting === u.id} className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0" title="Eliminar unidad">
                {deleting === u.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
