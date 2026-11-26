import { useEffect, useState } from 'react';
import { LayoutGrid, Loader2 } from 'lucide-react';
import { fetchConsortium, updateConsortium } from '../../services/consortium.service';
import { useData } from '../../context/DataContext';
import { OPTIONAL_MODULES } from '../../lib/constants';
import { useAppToast } from '../../lib/use-app-toast';

// El administrador elige qué secciones ven los vecinos en el menú. Un edificio
// chico no necesita Paquetería o Accesos: menos opciones, app más simple.

export default function ModulesCard({ userProfile }: { userProfile: any }) {
  const toast = useAppToast();
  const { setConsortium } = useData() as any;
  const cid: string | undefined = userProfile?.consortium_id;
  const [hidden, setHidden] = useState<string[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!cid) return;
    fetchConsortium(cid).then((c: any) => setHidden(Array.isArray(c?.hidden_modules) ? c.hidden_modules : []));
  }, [cid]);

  async function toggle(id: string) {
    if (!cid || !hidden) return;
    const next = hidden.includes(id) ? hidden.filter(m => m !== id) : [...hidden, id];
    setBusy(id);
    try {
      const updated: any = await updateConsortium(cid, { hidden_modules: next });
      setHidden(next);
      if (updated) setConsortium(updated); // refresca el menú lateral al instante
    } catch (err) {
      toast.error((err as Error).message, 'No se pudo guardar el cambio');
    } finally {
      setBusy(null);
    }
  }

  if (!hidden) return null;

  return (
    <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-5">
      <h4 className="font-bold text-slate-800 dark:text-ink-hi text-sm flex items-center gap-2 mb-1">
        <LayoutGrid size={16} className="text-brand-500" />
        Secciones visibles para los vecinos
      </h4>
      <p className="text-xs text-slate-500 dark:text-ink-mid mb-4">
        Apagá lo que tu edificio no usa para que el menú quede más simple. Inicio, Expensas, Novedades, Reclamos y Mensajes están siempre.
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {OPTIONAL_MODULES.map(mod => {
          const visible = !hidden.includes(mod.id);
          return (
            <li key={mod.id}>
              <button
                type="button"
                role="switch"
                aria-checked={visible}
                onClick={() => toggle(mod.id)}
                disabled={busy === mod.id}
                className="w-full flex items-center gap-3 text-left border border-slate-100 dark:border-white/[0.07] rounded-xl p-3 hover:border-slate-300 dark:hover:border-white/20 transition-colors disabled:opacity-60"
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-slate-800 dark:text-ink-hi">{mod.label}</span>
                  <span className="block text-xs text-slate-500 dark:text-ink-mid truncate">{mod.description}</span>
                </span>
                {busy === mod.id ? (
                  <Loader2 size={16} className="animate-spin text-slate-400 shrink-0" />
                ) : (
                  <span className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${visible ? 'bg-brand-500' : 'bg-slate-300 dark:bg-white/20'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${visible ? 'translate-x-5' : ''}`} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
