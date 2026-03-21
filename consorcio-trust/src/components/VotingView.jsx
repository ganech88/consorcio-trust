import { useState, useEffect } from 'react';
import { Vote, CheckCircle, Clock, Plus, Trash2, Loader2, X } from 'lucide-react';
import {
  fetchPolls,
  createPoll,
  fetchPollVotes,
  fetchUserVote,
  submitVote,
  deletePoll,
} from '../services/data.service';
import { useToast } from './Toast';

function isActive(poll) {
  return new Date(poll.ends_at) > new Date();
}

function ProgressBar({ percent, color }) {
  return (
    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

const BAR_COLORS = [
  'bg-blue-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-purple-500', 'bg-rose-500', 'bg-teal-500',
];

function PollCard({ poll, userId, isAdmin, onDelete }) {
  const toast = useToast();
  const [votes, setVotes] = useState([]);
  const [userVote, setUserVote] = useState(null);
  const [voting, setVoting] = useState(false);
  const [loadingVotes, setLoadingVotes] = useState(true);

  const active = isActive(poll);
  const options = Array.isArray(poll.options) ? poll.options : [];

  useEffect(() => {
    Promise.all([
      fetchPollVotes(poll.id),
      fetchUserVote(poll.id, userId),
    ]).then(([v, uv]) => {
      setVotes(v);
      setUserVote(uv);
    }).catch(() => {}).finally(() => setLoadingVotes(false));
  }, [poll.id, userId]);

  async function handleVote(idx) {
    if (userVote || !active) return;
    setVoting(true);
    try {
      const v = await submitVote({ pollId: poll.id, userId, optionIndex: idx });
      setUserVote(v);
      setVotes(prev => [...prev, v]);
      toast.success('Voto registrado');
    } catch (e) {
      toast.error(e.message, 'Error al votar');
    } finally {
      setVoting(false);
    }
  }

  const totalVotes = votes.length;
  const hasVoted = !!userVote;
  const showResults = hasVoted || !active;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                active
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
              }`}>
                {active ? 'Activa' : 'Cerrada'}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Clock size={11} />
                {active ? 'Cierra' : 'Cerró'}: {new Date(poll.ends_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <h4 className="font-bold text-slate-800 dark:text-slate-100">{poll.title}</h4>
            {poll.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{poll.description}</p>
            )}
          </div>
          {isAdmin && (
            <button
              onClick={() => onDelete(poll.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
              title="Eliminar encuesta"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Opciones */}
      <div className="px-5 pb-5 space-y-2">
        {loadingVotes ? (
          <div className="flex justify-center py-4">
            <Loader2 size={20} className="animate-spin text-blue-500" />
          </div>
        ) : (
          options.map((opt, idx) => {
            const count = votes.filter(v => v.option_index === idx).length;
            const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const isMyVote = userVote?.option_index === idx;

            return (
              <div key={idx} className="space-y-1.5">
                <button
                  onClick={() => handleVote(idx)}
                  disabled={hasVoted || !active || voting}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    isMyVote
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : hasVoted || !active
                      ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 cursor-default'
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-200 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {isMyVote && <CheckCircle size={14} className="text-blue-500 shrink-0" />}
                      {opt}
                    </span>
                    {showResults && (
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0 ml-2">
                        {count} ({percent}%)
                      </span>
                    )}
                  </div>
                </button>
                {showResults && (
                  <ProgressBar percent={percent} color={BAR_COLORS[idx % BAR_COLORS.length]} />
                )}
              </div>
            );
          })
        )}

        <p className="text-xs text-slate-400 dark:text-slate-500 text-right pt-1">
          {totalVotes} {totalVotes === 1 ? 'voto' : 'votos'}
          {hasVoted && ' · Tu voto fue registrado'}
        </p>
      </div>
    </div>
  );
}

function CreatePollForm({ session, userProfile, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: '',
    description: '',
    endsAt: '',
    options: ['', ''],
  });
  const [saving, setSaving] = useState(false);

  function setField(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  function addOption() {
    if (form.options.length >= 8) return;
    setForm(prev => ({ ...prev, options: [...prev.options, ''] }));
  }

  function removeOption(idx) {
    if (form.options.length <= 2) return;
    setForm(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== idx) }));
  }

  function setOption(idx, val) {
    setForm(prev => {
      const opts = [...prev.options];
      opts[idx] = val;
      return { ...prev, options: opts };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validOptions = form.options.map(o => o.trim()).filter(Boolean);
    if (validOptions.length < 2) { toast.error('Agregá al menos 2 opciones válidas'); return; }
    if (!form.endsAt) { toast.error('Seleccioná una fecha de cierre'); return; }

    setSaving(true);
    try {
      const poll = await createPoll({
        title: form.title,
        description: form.description || null,
        options: validOptions,
        endsAt: form.endsAt,
        consortiumId: userProfile?.consortium_id,
        createdBy: session.user.id,
      });
      onCreated(poll);
      toast.success('Encuesta creada');
      setForm({ title: '', description: '', endsAt: '', options: ['', ''] });
    } catch (e) {
      toast.error(e.message, 'Error al crear encuesta');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 space-y-4"
    >
      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Crear nueva encuesta</h4>

      <div>
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Título</label>
        <input
          type="text"
          value={form.title}
          onChange={e => setField('title', e.target.value)}
          placeholder="Ej: ¿Renovamos el SUM?"
          className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
          required
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Descripción (opcional)</label>
        <textarea
          value={form.description}
          onChange={e => setField('description', e.target.value)}
          placeholder="Información adicional..."
          rows={2}
          className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Fecha de cierre</label>
        <input
          type="datetime-local"
          value={form.endsAt}
          onChange={e => setField('endsAt', e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
          className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
          required
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Opciones</label>
          <button
            type="button"
            onClick={addOption}
            disabled={form.options.length >= 8}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40 flex items-center gap-1"
          >
            <Plus size={12} /> Agregar opción
          </button>
        </div>
        <div className="space-y-2">
          {form.options.map((opt, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                value={opt}
                onChange={e => setOption(idx, e.target.value)}
                placeholder={`Opción ${idx + 1}`}
                className="flex-1 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {form.options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(idx)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Vote size={16} />}
        Crear Encuesta
      </button>
    </form>
  );
}

export default function VotingView({ session, userProfile }) {
  const toast = useToast();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const isAdmin = userProfile?.role === 'admin';
  const userId = session?.user?.id;

  useEffect(() => {
    fetchPolls(userProfile?.consortium_id)
      .then(setPolls)
      .catch(e => toast.error(e.message, 'Error al cargar votaciones'))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, toast]);

  async function handleDelete(id) {
    try {
      await deletePoll(id);
      setPolls(prev => prev.filter(p => p.id !== id));
      toast.success('Encuesta eliminada');
    } catch (e) {
      toast.error(e.message, 'Error al eliminar');
    }
  }

  const active = polls.filter(p => isActive(p));
  const closed = polls.filter(p => !isActive(p));

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Vote size={22} className="text-indigo-500" />
            Votaciones
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Participá en las decisiones del consorcio
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus size={16} />
            Nueva
          </button>
        )}
      </div>

      {/* Formulario de creación (admin) */}
      {isAdmin && showForm && (
        <CreatePollForm
          session={session}
          userProfile={userProfile}
          onCreated={poll => { setPolls(prev => [poll, ...prev]); setShowForm(false); }}
        />
      )}

      {/* Activas */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
            Activas ({active.length})
          </h4>
          {active.map(poll => (
            <PollCard
              key={poll.id}
              poll={poll}
              userId={userId}
              isAdmin={isAdmin}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Cerradas */}
      {closed.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
            Cerradas ({closed.length})
          </h4>
          {closed.map(poll => (
            <PollCard
              key={poll.id}
              poll={poll}
              userId={userId}
              isAdmin={isAdmin}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {polls.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center">
          <Vote size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No hay votaciones activas</p>
          {isAdmin && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:underline"
            >
              Crear la primera encuesta
            </button>
          )}
        </div>
      )}
    </div>
  );
}
