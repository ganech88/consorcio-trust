import { useMemo, useState } from 'react';
import { ClipboardPaste, Loader2, ChevronDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { createUnitsBulk } from '../../services/units.service';
import { parseUnitsPaste } from '../../lib/units-import';
import { useAppToast } from '../../lib/use-app-toast';

// Carga masiva de unidades pegando filas copiadas de Excel o Google Sheets.

const EXAMPLE = 'Unidad\tPiso\tDepto\tCoeficiente\n1A\t1\tA\t12,5\n1B\t1\tB\t12,5\nPB Local\tPB\t\t25';

export default function UnitsImportCard({ consortiumId, existingNames, onImported }: {
  consortiumId: string | undefined;
  existingNames: string[];
  onImported: (units: any[]) => void;
}) {
  const toast = useAppToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const parsed = useMemo(() => parseUnitsPaste(text, existingNames), [text, existingNames]);
  const hasInput = text.trim() !== '';

  async function handleImport() {
    if (!consortiumId || parsed.units.length === 0) return;
    setSaving(true);
    try {
      const created = await createUnitsBulk(consortiumId, parsed.units);
      onImported(created);
      toast.success(`Se cargaron ${created.length} unidades`);
      setText('');
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message, 'No se pudieron cargar las unidades');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07]">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="w-full flex items-center gap-3 p-5 text-left">
        <ClipboardPaste size={18} className="text-brand-500 shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-slate-800 dark:text-ink-hi text-sm">Cargar muchas unidades de una vez</span>
          <span className="block text-xs text-slate-500 dark:text-ink-mid">Copiá las filas desde tu Excel y pegalas acá.</span>
        </span>
        <ChevronDown size={18} className={`text-slate-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3">
          <p className="text-xs text-slate-500 dark:text-ink-mid">
            Columnas, en este orden: <strong>Unidad · Piso · Depto · Coeficiente</strong>. Solo la unidad es obligatoria;
            también podés pegar dos columnas (Unidad y Coeficiente). El coeficiente es el porcentaje del reglamento (Ej: 4,25).
          </p>
          <label htmlFor="units-paste" className="sr-only">Filas copiadas desde Excel</label>
          <textarea
            id="units-paste"
            value={text}
            onChange={e => setText(e.target.value)}
            rows={6}
            spellCheck={false}
            placeholder={EXAMPLE}
            className="w-full border border-slate-200 dark:border-white/[0.09] rounded-xl px-3 py-2.5 text-sm font-mono bg-white dark:bg-surface-panel2 dark:text-ink-hi focus:ring-2 focus:ring-brand-500 outline-none"
          />

          {hasInput && (
            <div className="space-y-2">
              {parsed.units.length > 0 && (
                <p className="text-sm text-slate-700 dark:text-ink-hi flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  {parsed.units.length} {parsed.units.length === 1 ? 'unidad lista' : 'unidades listas'} para cargar
                  {parsed.coefficientSum > 0 && <> · coeficientes: {parsed.coefficientSum.toLocaleString('es-AR')}%</>}
                </p>
              )}
              {parsed.errors.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-400/[0.10] border border-amber-200 dark:border-amber-700 rounded-xl p-3">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-1">
                    <AlertTriangle size={14} /> {parsed.errors.length === 1 ? 'Hay 1 fila que no se va a cargar' : `Hay ${parsed.errors.length} filas que no se van a cargar`}
                  </p>
                  <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-0.5 list-disc pl-4">
                    {parsed.errors.slice(0, 8).map(err => <li key={err}>{err}</li>)}
                    {parsed.errors.length > 8 && <li>…y {parsed.errors.length - 8} más.</li>}
                  </ul>
                </div>
              )}
            </div>
          )}

          <button type="button" onClick={handleImport} disabled={saving || parsed.units.length === 0}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <ClipboardPaste size={16} />}
            {parsed.units.length > 0 ? `Cargar ${parsed.units.length} ${parsed.units.length === 1 ? 'unidad' : 'unidades'}` : 'Cargar unidades'}
          </button>
        </div>
      )}
    </div>
  );
}
