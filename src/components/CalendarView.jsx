import { useState, useEffect } from 'react';
import { CalendarDays, Plus, Trash2, ChevronLeft, ChevronRight, Loader2, Wrench } from 'lucide-react';
import { fetchEvents, createEvent, deleteEvent, fetchMaintenanceTasks } from '../services/data.service';
import { useToast } from './Toast';

const EVENT_TYPES = [
  { value: 'general',        label: 'General',           color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-brand-400',           dot: 'bg-blue-500' },
  { value: 'mantenimiento',  label: 'Mantenimiento',     color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',         dot: 'bg-amber-500' },
  { value: 'reunion',        label: 'Reunión',           color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',     dot: 'bg-indigo-500' },
  { value: 'corte',          label: 'Corte de servicio', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',                 dot: 'bg-red-500' },
  { value: 'fumigacion',     label: 'Fumigación',        color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', dot: 'bg-emerald-500' },
];

function getTypeConfig(type) {
  return EVENT_TYPES.find(t => t.value === type) ?? EVENT_TYPES[0];
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function sameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function MiniCalendar({ year, month, events, selectedDay, onSelectDay }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function hasEvents(day) {
    if (!day) return false;
    const date = new Date(year, month, day);
    return events.some(e => {
      const start = new Date(e.start_date);
      return sameDay(start, date);
    });
  }

  return (
    <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-4">
      <div className="grid grid-cols-7 gap-0 mb-2">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-slate-400 dark:text-ink-low py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;
          const date = new Date(year, month, day);
          const isToday = sameDay(date, today);
          const isSelected = selectedDay && sameDay(date, selectedDay);
          const hasEv = hasEvents(day);

          return (
            <button
              key={day}
              onClick={() => onSelectDay(date)}
              className={`relative w-full aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : isToday
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-brand-400 font-bold'
                  : 'text-slate-700 dark:text-ink-mid hover:bg-slate-50 dark:hover:bg-white/[0.06]'
              }`}
            >
              {day}
              {hasEv && !isSelected && (
                <span className="absolute bottom-1 w-1 h-1 bg-blue-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CreateEventForm({ session, userProfile, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'general',
    startDate: '',
    endDate: '',
    allDay: true,
  });
  const [saving, setSaving] = useState(false);

  function setField(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.startDate) { toast.error('Seleccioná una fecha de inicio'); return; }
    setSaving(true);
    try {
      const ev = await createEvent({
        title: form.title,
        description: form.description || null,
        type: form.type,
        startDate: form.allDay ? `${form.startDate}T00:00:00` : form.startDate,
        endDate: form.endDate ? (form.allDay ? `${form.endDate}T23:59:59` : form.endDate) : null,
        allDay: form.allDay,
        consortiumId: userProfile?.consortium_id,
        createdBy: session.user.id,
      });
      onCreated(ev);
      toast.success('Evento creado');
      setForm({ title: '', description: '', type: 'general', startDate: '', endDate: '', allDay: true });
    } catch (e) {
      toast.error(e.message, 'Error al crear evento');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-5 space-y-4">
      <h4 className="font-bold text-slate-800 dark:text-ink-hi text-sm">Crear evento</h4>

      <div>
        <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">Título</label>
        <input
          type="text"
          value={form.title}
          onChange={e => setField('title', e.target.value)}
          placeholder="Ej: Reunión de propietarios"
          className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-blue-500 outline-none"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">Tipo</label>
          <select
            value={form.type}
            onChange={e => setField('type', e.target.value)}
            className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer select-none pb-2.5">
            <div
              onClick={() => setField('allDay', !form.allDay)}
              className={`w-10 h-5 rounded-full transition-colors relative ${form.allDay ? 'bg-blue-600' : 'bg-slate-300 dark:bg-surface-panel2'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.allDay ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-slate-600 dark:text-ink-mid">Todo el día</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">
            Fecha {!form.allDay ? 'y hora ' : ''}de inicio
          </label>
          <input
            type={form.allDay ? 'date' : 'datetime-local'}
            value={form.startDate}
            onChange={e => setField('startDate', e.target.value)}
            className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">
            Fecha de fin (opcional)
          </label>
          <input
            type={form.allDay ? 'date' : 'datetime-local'}
            value={form.endDate}
            onChange={e => setField('endDate', e.target.value)}
            className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block">Descripción (opcional)</label>
        <textarea
          value={form.description}
          onChange={e => setField('description', e.target.value)}
          placeholder="Detalles del evento..."
          rows={2}
          className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-blue-500 outline-none resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <CalendarDays size={16} />}
        Crear Evento
      </button>
    </form>
  );
}

export default function CalendarView({ session, userProfile }) {
  const toast = useToast();
  const isAdmin = userProfile?.role === 'admin';
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today);
  const [events, setEvents] = useState([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    const cid = userProfile?.consortium_id;
    Promise.all([
      fetchEvents(cid),
      fetchMaintenanceTasks(cid).catch(() => []),
    ]).then(([evs, tasks]) => {
      setEvents(evs);
      setMaintenanceTasks(tasks);
    }).catch(e => toast.error(e.message, 'Error al cargar calendario'))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, toast]);

  // Convert maintenance tasks to calendar events (synthetic, with type='mantenimiento')
  const maintenanceEvents = maintenanceTasks
    .filter(t => t.next_due)
    .map(t => ({
      id: `maint-${t.id}`,
      title: t.name,
      description: t.notes || null,
      type: 'mantenimiento',
      start_date: t.next_due + 'T00:00:00',
      all_day: true,
      _isMaintenance: true,
    }));

  const allEvents = [...events, ...maintenanceEvents];

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await deleteEvent(id);
      setEvents(prev => prev.filter(e => e.id !== id));
      toast.success('Evento eliminado');
    } catch (e) {
      toast.error(e.message, 'Error al eliminar');
    } finally {
      setDeleting(null);
    }
  }

  const dayEvents = selectedDay
    ? allEvents.filter(e => sameDay(new Date(e.start_date), selectedDay))
    : [];

  const upcoming = allEvents
    .filter(e => new Date(e.start_date) >= today)
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-800 dark:text-ink-hi flex items-center gap-2">
          <CalendarDays size={22} className="text-blue-500" />
          Calendario
        </h3>
        {isAdmin && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus size={16} />
            {showForm ? 'Cancelar' : 'Nuevo evento'}
          </button>
        )}
      </div>

      {/* Formulario admin */}
      {isAdmin && showForm && (
        <CreateEventForm
          session={session}
          userProfile={userProfile}
          onCreated={ev => { setEvents(prev => [...prev, ev].sort((a, b) => new Date(a.start_date) - new Date(b.start_date))); setShowForm(false); }}
        />
      )}

      {/* Navegación de mes */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={prevMonth}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-500 dark:text-ink-mid transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <h4 className="font-bold text-slate-800 dark:text-ink-hi">
          {MONTHS[month]} {year}
        </h4>
        <button
          onClick={nextMonth}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-500 dark:text-ink-mid transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Calendario */}
      <MiniCalendar
        year={year}
        month={month}
        events={allEvents}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
      />

      {/* Eventos del día seleccionado */}
      {selectedDay && (
        <div>
          <h4 className="text-xs font-bold text-slate-400 dark:text-ink-low uppercase tracking-wider mb-3 px-1">
            {selectedDay.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h4>
          {dayEvents.length === 0 ? (
            <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-6 text-center">
              <p className="text-slate-400 dark:text-ink-low text-sm">Sin eventos este día</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dayEvents.map(ev => {
                const tc = getTypeConfig(ev.type);
                return (
                  <div key={ev.id} className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-4 flex items-start gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${tc.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-ink-hi">{ev.title}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tc.color}`}>{tc.label}</span>
                      {ev.description && (
                        <p className="text-xs text-slate-500 dark:text-ink-mid mt-1">{ev.description}</p>
                      )}
                      {!ev.all_day && (
                        <p className="text-xs text-slate-400 dark:text-ink-low mt-1">
                          {new Date(ev.start_date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                          {ev.end_date && ` — ${new Date(ev.end_date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`}
                        </p>
                      )}
                    </div>
                    {isAdmin && !ev._isMaintenance && (
                      <button
                        onClick={() => handleDelete(ev.id)}
                        disabled={deleting === ev.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0 disabled:opacity-60"
                      >
                        {deleting === ev.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Próximos eventos */}
      {upcoming.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-slate-400 dark:text-ink-low uppercase tracking-wider mb-3 px-1">
            Próximos eventos
          </h4>
          <div className="space-y-2">
            {upcoming.map(ev => {
              const tc = getTypeConfig(ev.type);
              const evDate = new Date(ev.start_date);
              return (
                <div key={ev.id} className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-4 flex items-center gap-4">
                  <div className="text-center shrink-0 w-10">
                    <p className="text-xs font-bold text-slate-400 dark:text-ink-low uppercase">{MONTHS[evDate.getMonth()].slice(0, 3)}</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-ink-hi leading-none">{evDate.getDate()}</p>
                  </div>
                  <div className={`w-0.5 h-10 rounded-full ${tc.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-ink-hi text-sm truncate">{ev.title}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tc.color}`}>{tc.label}</span>
                  </div>
                  <button
                    onClick={() => { setSelectedDay(evDate); setYear(evDate.getFullYear()); setMonth(evDate.getMonth()); }}
                    className="text-xs text-blue-600 dark:text-brand-400 hover:underline shrink-0"
                  >
                    Ver
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
