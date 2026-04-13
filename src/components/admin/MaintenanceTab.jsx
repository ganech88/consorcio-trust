import { useState, useEffect } from 'react';
import { Wrench, Plus, Loader2, CheckCircle } from 'lucide-react';
import { fetchMaintenanceTasks, createMaintenanceTask, completeMaintenanceTask } from '../../services/data.service';
import { useToast } from '../Toast';
import { LoadingSpinner, EmptyState } from './shared';

const RECURRENCES = [
  { value: 'weekly',    label: 'Semanal' },
  { value: 'monthly',   label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'biannual',  label: 'Semestral' },
  { value: 'annual',    label: 'Anual' },
];

const MAINTENANCE_CATEGORIES = ['Limpieza', 'Eléctrico', 'Plomería', 'Ascensor', 'Jardín', 'Pintura', 'Otro'];

export default function MaintenanceTab({ session, userProfile }) {
  const toast = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(null);
  const [form, setForm] = useState({
    name: '', category: MAINTENANCE_CATEGORIES[0],
    recurrence: 'monthly', next_due: '', estimated_cost: '', notes: '',
  });

  function setField(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  useEffect(() => {
    fetchMaintenanceTasks(userProfile?.consortium_id)
      .then(setTasks)
      .catch(e => toast.error(e.message, 'Error al cargar tareas'))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, toast]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Ingresá un nombre para la tarea'); return; }
    setSaving(true);
    try {
      const task = await createMaintenanceTask({
        consortiumId: userProfile?.consortium_id,
        name: form.name.trim(),
        category: form.category,
        recurrence: form.recurrence,
        nextDue: form.next_due || null,
        estimatedCost: form.estimated_cost ? Number(form.estimated_cost) : null,
        notes: form.notes.trim() || null,
        createdBy: session.user.id,
      });
      setTasks(prev => [task, ...prev]);
      setForm({ name: '', category: MAINTENANCE_CATEGORIES[0], recurrence: 'monthly', next_due: '', estimated_cost: '', notes: '' });
      toast.success('Tarea de mantenimiento creada');
    } catch (e) {
      toast.error(e.message, 'Error al crear tarea');
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(id) {
    setCompleting(id);
    try {
      const updated = await completeMaintenanceTask(id);
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));
      toast.success('Tarea completada');
    } catch (e) {
      toast.error(e.message, 'Error al completar tarea');
    } finally {
      setCompleting(null);
    }
  }

  function getDaysUntil(dateStr) {
    if (!dateStr) return null;
    const diff = new Date(dateStr + 'T00:00:00') - new Date();
    return Math.ceil(diff / 86400000);
  }

  function urgencyClasses(days) {
    if (days === null) return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    if (days < 0)  return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    if (days <= 7)  return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    if (days <= 14) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
  }

  return (
    <div className="space-y-6">
      {/* Create task form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm space-y-4">
        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
          <Wrench size={16} className="text-amber-500" />
          Agregar tarea de mantenimiento
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Nombre de la tarea</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="Ej: Limpieza de tanques"
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Categoría</label>
            <select
              value={form.category}
              onChange={e => setField('category', e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
            >
              {MAINTENANCE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Recurrencia</label>
            <select
              value={form.recurrence}
              onChange={e => setField('recurrence', e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
            >
              {RECURRENCES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Próximo vencimiento</label>
            <input
              type="date"
              value={form.next_due}
              onChange={e => setField('next_due', e.target.value)}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Costo estimado ($)</label>
            <input
              type="number"
              min="0"
              value={form.estimated_cost}
              onChange={e => setField('estimated_cost', e.target.value)}
              placeholder="Opcional"
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Notas</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              placeholder="Observaciones..."
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Crear tarea
        </button>
      </form>

      {/* Task list */}
      {loading ? (
        <LoadingSpinner />
      ) : tasks.length === 0 ? (
        <EmptyState icon={Wrench} text="No hay tareas de mantenimiento registradas" />
      ) : (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
            Tareas registradas ({tasks.length})
          </h4>
          {tasks.map(task => {
            const days = getDaysUntil(task.next_due);
            const urgency = urgencyClasses(days);
            return (
              <div key={task.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 flex items-start gap-4">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center shrink-0">
                  <Wrench size={18} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{task.name}</p>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded">{task.category}</span>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {RECURRENCES.find(r => r.value === task.recurrence)?.label ?? task.recurrence}
                    {task.estimated_cost ? ` · Est. $${Number(task.estimated_cost).toLocaleString('es-AR')}` : ''}
                  </p>
                  {task.next_due && (
                    <span className={`inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${urgency}`}>
                      {days === null ? 'Sin fecha'
                        : days < 0 ? `Vencido hace ${Math.abs(days)}d`
                        : days === 0 ? 'Vence hoy'
                        : `Vence en ${days}d`}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleComplete(task.id)}
                  disabled={completing === task.id}
                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0"
                >
                  {completing === task.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                  Completar
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
