import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, ChevronRight, Rocket, X } from 'lucide-react';
import { fetchUnits } from '../../services/units.service';
import { fetchConsortium, fetchConsortiumMembers, fetchUnitInvites } from '../../services/consortium.service';
import { fetchExpensePeriods } from '../../services/expenses.service';
import { buildSetupSteps, setupProgress, type SetupStep } from '../../lib/setup-steps';

// "Primeros pasos": guía al administrador de un consorcio nuevo hasta su primera
// liquidación. Desaparece sola cuando está todo hecho (o si la cierra).

const dismissKey = (cid: string) => `ct-setup-dismissed-${cid}`;

function isDismissed(cid: string): boolean {
  try { return localStorage.getItem(dismissKey(cid)) === '1'; } catch { return false; }
}

export default function SetupChecklist({ userProfile, onGo }: { userProfile: any; onGo: (tab: string) => void }) {
  const cid: string | undefined = userProfile?.consortium_id;
  const [steps, setSteps] = useState<SetupStep[] | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!cid) return;
    let alive = true;
    setHidden(isDismissed(cid));
    Promise.all([
      fetchUnits(cid),
      fetchConsortium(cid),
      fetchConsortiumMembers(cid),
      fetchUnitInvites(cid),
      fetchExpensePeriods(cid),
    ]).then(([units, consortium, members, invites, periods]: any[]) => {
      if (!alive) return;
      setSteps(buildSetupSteps({
        unitsCount: units.length,
        coefficientSum: units.reduce((s: number, u: any) => s + (Number(u.coefficient) || 0), 0),
        hasPaymentMethod: !!(consortium?.payment_cbu || consortium?.payment_alias),
        residentsCount: members.filter((m: any) => !['admin', 'super_admin'].includes(m.role)).length,
        invitesCount: invites.length,
        periodsCount: periods.length,
      }));
    }).catch(() => { /* la guía es opcional: si falla la carga, no se muestra */ });
    return () => { alive = false; };
  }, [cid]);

  if (!cid || !steps || hidden) return null;
  const progress = setupProgress(steps);
  if (progress.complete) return null;

  function dismiss() {
    setHidden(true);
    try { localStorage.setItem(dismissKey(cid as string), '1'); } catch { /* sin storage */ }
  }

  return (
    <section aria-label="Primeros pasos" className="bg-white dark:bg-surface-panel rounded-2xl border border-brand-200 dark:border-brand-700/60 p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-400/[0.14] flex items-center justify-center shrink-0">
          <Rocket size={20} className="text-brand-600 dark:text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-800 dark:text-ink-hi">Primeros pasos</h4>
          <p className="text-sm text-slate-500 dark:text-ink-mid">
            {progress.done === 0
              ? 'Dejá tu consorcio listo para cobrar la primera expensa. Son 5 pasos.'
              : `Vas ${progress.done} de ${progress.total}. Seguí con: ${progress.next?.title.toLowerCase()}.`}
          </p>
        </div>
        <button type="button" onClick={dismiss} aria-label="Ocultar primeros pasos"
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-ink-hi rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] shrink-0">
          <X size={16} />
        </button>
      </div>

      <div className="mt-3 h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.07] overflow-hidden" role="progressbar"
        aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
        <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
      </div>

      <ol className="mt-4 space-y-1">
        {steps.map((step, i) => {
          const isNext = progress.next?.id === step.id;
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => onGo(step.tab)}
                className={`w-full flex items-center gap-3 text-left rounded-xl px-3 py-2.5 transition-colors ${
                  isNext ? 'bg-brand-50 dark:bg-brand-400/[0.10]' : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                }`}
              >
                {step.done
                  ? <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                  : <Circle size={20} className={`shrink-0 ${isNext ? 'text-brand-500' : 'text-slate-300 dark:text-ink-low'}`} />}
                <span className="flex-1 min-w-0">
                  <span className={`block text-sm font-semibold ${step.done ? 'text-slate-400 dark:text-ink-low line-through' : 'text-slate-800 dark:text-ink-hi'}`}>
                    {i + 1}. {step.title}
                  </span>
                  {!step.done && <span className="block text-xs text-slate-500 dark:text-ink-mid">{step.description}</span>}
                </span>
                {isNext && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-brand-700 dark:text-brand-400 shrink-0">
                    {step.action} <ChevronRight size={14} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
