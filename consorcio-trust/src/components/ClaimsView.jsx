import { useState } from 'react';
import { Plus, AlertCircle, CheckCircle2, Clock, MessageSquare, Filter, ChevronDown } from 'lucide-react';
import { createClaim } from '../services/data.service';
import { useToast } from './Toast';
import { CLAIM_STATUS } from '../lib/constants';

const STATUS_CONFIG = {
  [CLAIM_STATUS.OPEN]: {
    label: 'Pendiente',
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    icon: Clock,
  },
  [CLAIM_STATUS.PENDING]: {
    label: 'En Proceso',
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    icon: AlertCircle,
  },
  [CLAIM_STATUS.CLOSED]: {
    label: 'Resuelto',
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: CheckCircle2,
  },
};

const FILTER_OPTIONS = [
  { id: 'all', label: 'Todos' },
  { id: CLAIM_STATUS.OPEN, label: 'Pendientes' },
  { id: CLAIM_STATUS.PENDING, label: 'En Proceso' },
  { id: CLAIM_STATUS.CLOSED, label: 'Resueltos' },
];

const CATEGORY_OPTIONS = [
  'Mantenimiento general',
  'Ascensores',
  'Electricidad',
  'Plomería',
  'Limpieza',
  'Seguridad',
  'Ruidos molestos',
  'Otro',
];

export default function ClaimsView({ reclamos, setReclamos, session }) {
  const [nuevoReclamo, setNuevoReclamo] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const toast = useToast();

  async function handleCreate(e) {
    e.preventDefault();
    if (!nuevoReclamo.trim()) return;

    setCreating(true);
    try {
      const newClaim = await createClaim({
        title: nuevoReclamo.trim(),
        consortiumId: session.user.id,
        userId: session.user.id,
      });

      newClaim.category = category;
      newClaim.description = description;

      setReclamos((prev) => [newClaim, ...prev]);
      setNuevoReclamo('');
      setDescription('');
      setCategory('');
      setShowForm(false);
      toast.success('Reclamo creado exitosamente');
    } catch (error) {
      toast.error(error.message, 'Error al crear reclamo');
    } finally {
      setCreating(false);
    }
  }

  const filteredClaims = filter === 'all'
    ? reclamos
    : reclamos.filter((r) => r.status === filter);

  const counts = {
    all: reclamos.length,
    [CLAIM_STATUS.OPEN]: reclamos.filter((r) => r.status === CLAIM_STATUS.OPEN).length,
    [CLAIM_STATUS.PENDING]: reclamos.filter((r) => r.status === CLAIM_STATUS.PENDING).length,
    [CLAIM_STATUS.CLOSED]: reclamos.filter((r) => r.status === CLAIM_STATUS.CLOSED).length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <MessageSquare size={20} className="text-blue-600 dark:text-blue-400" />
          Mis Reclamos
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            showForm
              ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-100 dark:shadow-blue-900/30 hover:from-blue-700 hover:to-indigo-700'
          }`}
        >
          {showForm ? (
            <>Cancelar</>
          ) : (
            <><Plus size={16} /> Nuevo Reclamo</>
          )}
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 animate-fade-in">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Asunto del reclamo</label>
              <input
                type="text"
                value={nuevoReclamo}
                onChange={(e) => setNuevoReclamo(e.target.value)}
                placeholder="Ej: Luz pasillo PB quemada..."
                className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50/50 dark:bg-slate-700 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-700"
                maxLength={200}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Categoría</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50/50 dark:bg-slate-700 dark:text-slate-100 appearance-none cursor-pointer"
                >
                  <option value="">Seleccionar categoría...</option>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Descripción <span className="text-slate-400 dark:text-slate-500 font-normal">(opcional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el problema con más detalle..."
                rows={3}
                className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50/50 dark:bg-slate-700 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-700 resize-none"
                maxLength={500}
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-right">{description.length}/500</p>
            </div>

            <button
              type="submit"
              disabled={creating || !nuevoReclamo.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center gap-2 shadow-lg shadow-blue-100 dark:shadow-blue-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Plus size={18} />
              )}
              Crear Reclamo
            </button>
          </form>
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setFilter(opt.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              filter === opt.id
                ? 'bg-blue-600 dark:bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {opt.label}
            {counts[opt.id] > 0 && (
              <span className={`ml-1.5 ${filter === opt.id ? 'text-blue-200' : 'text-slate-400 dark:text-slate-500'}`}>
                {counts[opt.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredClaims.length === 0 ? (
          <div className="text-center py-16">
            <AlertCircle size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
            <h4 className="font-semibold text-slate-600 dark:text-slate-300 text-lg">
              {filter === 'all' ? 'No hay reclamos' : `No hay reclamos ${FILTER_OPTIONS.find(f => f.id === filter)?.label.toLowerCase()}`}
            </h4>
            <p className="text-slate-400 dark:text-slate-500 mt-1">
              {filter === 'all' ? 'Crea uno nuevo usando el botón de arriba' : 'Probá con otro filtro'}
            </p>
          </div>
        ) : (
          filteredClaims.map((rec) => {
            const status = STATUS_CONFIG[rec.status] || STATUS_CONFIG[CLAIM_STATUS.OPEN];
            const StatusIcon = status.icon;

            return (
              <div
                key={rec.id}
                className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-slate-200 dark:hover:border-slate-600 transition-all group"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`p-2 rounded-lg ${status.bg} shrink-0 mt-0.5`}>
                      <StatusIcon size={16} className={status.text} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                        {rec.title}
                      </h4>
                      {rec.category && (
                        <span className="inline-block bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 uppercase tracking-wider">
                          {rec.category}
                        </span>
                      )}
                      {rec.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">{rec.description}</p>
                      )}
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                        {rec.created_at ? new Date(rec.created_at).toLocaleDateString('es-AR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        }) : 'Fecha desconocida'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shrink-0 ml-3 border ${status.bg} ${status.text} ${status.border}`}
                  >
                    {status.label}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
