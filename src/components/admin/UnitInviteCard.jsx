import { useState, useEffect, useMemo } from 'react';
import { Ticket, Copy, Check, Loader2, Plus } from 'lucide-react';
import { fetchUnits } from '../../services/units.service';
import { createUnitInvite, fetchUnitInvites } from '../../services/data.service';
import { useToast } from '../Toast';

const ROLE_LABEL = { owner: 'Propietario', resident: 'Inquilino' };

export default function UnitInviteCard({ userProfile }) {
  const toast = useToast();
  const [units, setUnits] = useState([]);
  const [invites, setInvites] = useState([]);
  const [form, setForm] = useState({ unitId: '', role: 'owner', fullName: '' });
  const [generating, setGenerating] = useState(false);
  const [lastCode, setLastCode] = useState(null);
  const [copied, setCopied] = useState(null);

  const cid = userProfile?.consortium_id;

  useEffect(() => {
    if (!cid) return;
    fetchUnits(cid).then(setUnits).catch(() => {});
    fetchUnitInvites(cid).then(setInvites).catch(() => {});
  }, [cid]);

  const unitName = useMemo(() => Object.fromEntries(units.map(u => [u.id, u.name])), [units]);

  async function handleGenerate(e) {
    e.preventDefault();
    if (!form.unitId) { toast.error('Elegí la unidad a la que va asignada la persona'); return; }
    setGenerating(true);
    try {
      const { code } = await createUnitInvite({
        consortiumId: cid, unitId: form.unitId, role: form.role, fullName: form.fullName.trim(),
      });
      setLastCode(code);
      setForm(f => ({ ...f, fullName: '' }));
      setInvites(await fetchUnitInvites(cid));
      toast.success('Código generado');
    } catch (err) {
      toast.error(err.message, 'No se pudo generar el código');
    } finally {
      setGenerating(false);
    }
  }

  function copy(code) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(c => (c === code ? null : c)), 2000);
    });
  }

  const inputCls = 'w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none';
  const labelCls = 'text-xs font-semibold text-slate-500 dark:text-ink-mid mb-1.5 block';

  return (
    <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-5">
      <h4 className="font-bold text-slate-800 dark:text-ink-hi text-sm flex items-center gap-2 mb-1">
        <Ticket size={16} className="text-brand-500" />
        Invitar a una unidad
      </h4>
      <p className="text-xs text-slate-500 dark:text-ink-mid mb-4">
        Generá un código atado a una unidad y un rol. Cuando la persona se registre con ese código,
        queda vinculada automáticamente a su unidad (y empieza a recibir sus expensas).
      </p>

      <form onSubmit={handleGenerate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Unidad</label>
          <select value={form.unitId} onChange={e => setForm(f => ({ ...f, unitId: e.target.value }))} className={inputCls}>
            <option value="">Elegí…</option>
            {units.map(u => <option key={u.id} value={u.id}>Unidad {u.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Rol</label>
          <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={inputCls}>
            <option value="owner">Propietario</option>
            <option value="resident">Inquilino</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Nombre (opcional)</label>
          <input type="text" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Ej: Juan Pérez" className={inputCls} />
        </div>
        <div className="sm:col-span-3">
          <button type="submit" disabled={generating} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Generar código
          </button>
        </div>
      </form>

      {lastCode && (
        <div className="mt-4 flex items-center gap-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl px-4 py-3">
          <span className="flex-1 font-mono text-xl font-bold tracking-widest text-brand-600 dark:text-brand-400 text-center select-all">{lastCode}</span>
          <button onClick={() => copy(lastCode)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-slate-100 dark:bg-surface-panel2 text-slate-600 dark:text-ink-mid hover:bg-brand-100 dark:hover:bg-brand-900/30">
            {copied === lastCode ? <Check size={15} /> : <Copy size={15} />}
            {copied === lastCode ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      )}

      {invites.length > 0 && (
        <div className="mt-4">
          <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-ink-low mb-2">Invitaciones generadas</h5>
          <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="font-mono font-bold text-slate-700 dark:text-ink-hi w-24 shrink-0">{inv.code}</span>
                <span className="text-slate-500 dark:text-ink-mid flex-1 truncate">
                  {inv.unit_id ? `Unidad ${unitName[inv.unit_id] ?? '—'}` : 'Sin unidad'} · {ROLE_LABEL[inv.role] ?? inv.role}
                  {inv.full_name ? ` · ${inv.full_name}` : ''}
                </span>
                {inv.used_at ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-surface-panel2 dark:text-ink-low shrink-0">Usado</span>
                ) : (
                  <span className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-400/[0.14] dark:text-emerald-400">Pendiente</span>
                    <button onClick={() => copy(inv.code)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]" title="Copiar código">
                      {copied === inv.code ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
