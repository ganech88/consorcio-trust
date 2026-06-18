import { useState, useEffect, useMemo } from 'react';
import { BarChart3, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { fetchAnnualReport } from '../../services/reports.service';
import { useToast } from '../Toast';
import { LoadingSpinner, EmptyState, fmtCurrency } from './shared';

function monthLabel(ym) {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' });
}

export default function RendicionTab({ userProfile }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnualReport(userProfile?.consortium_id, 12)
      .then(setRows)
      .catch(e => toast.error(e.message, 'Error al cargar la rendición'))
      .finally(() => setLoading(false));
  }, [userProfile?.consortium_id, toast]);

  const { byCategory, byMonth, total } = useMemo(() => {
    const cat = {}, mon = {};
    let t = 0;
    for (const r of rows) {
      const a = Number(r.amount || 0);
      t += a;
      cat[r.category || 'Otro'] = (cat[r.category || 'Otro'] || 0) + a;
      const ym = (r.date || '').slice(0, 7);
      if (ym) mon[ym] = (mon[ym] || 0) + a;
    }
    return {
      byCategory: Object.entries(cat).sort((a, b) => b[1] - a[1]),
      byMonth: Object.entries(mon).sort((a, b) => b[0].localeCompare(a[0])),
      total: t,
    };
  }, [rows]);

  function exportExcel() {
    try {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        byMonth.map(([m, v]) => ({ Mes: monthLabel(m), Egresos: v }))
      ), 'Por mes');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        byCategory.map(([c, v]) => ({ Categoria: c, Egresos: v }))
      ), 'Por categoria');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        rows.map(r => ({ Fecha: r.date, Categoria: r.category, Detalle: r.description, Monto: Number(r.amount || 0) }))
      ), 'Detalle');
      XLSX.writeFile(wb, 'rendicion-anual.xlsx');
    } catch (e) {
      toast.error(e.message, 'No se pudo exportar');
    }
  }

  if (loading) return <LoadingSpinner />;
  if (rows.length === 0) return <EmptyState icon={BarChart3} text="No hay egresos registrados en los últimos 12 meses" />;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-5 flex items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-slate-800 dark:text-ink-hi text-sm flex items-center gap-2">
            <BarChart3 size={16} className="text-brand-500" />
            Rendición de cuentas — últimos 12 meses
          </h4>
          <p className="text-2xl font-bold text-slate-800 dark:text-ink-hi font-mono mt-2">{fmtCurrency(total)}</p>
          <p className="text-xs text-slate-400 dark:text-ink-low">Total de egresos del período</p>
        </div>
        <button onClick={exportExcel} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shrink-0">
          <FileSpreadsheet size={16} /> Exportar Excel
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Por categoría */}
        <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-5">
          <h4 className="text-xs font-bold text-slate-400 dark:text-ink-low uppercase tracking-wider mb-3">Por categoría</h4>
          <div className="space-y-2">
            {byCategory.map(([c, v]) => (
              <div key={c} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 dark:border-white/[0.06] last:border-0">
                <span className="text-slate-700 dark:text-ink-mid">{c}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-800 dark:text-ink-hi">{fmtCurrency(v)}</span>
                  <span className="text-[10px] text-slate-400 dark:text-ink-low w-10 text-right">{total > 0 ? Math.round(v / total * 100) : 0}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Por mes */}
        <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-5">
          <h4 className="text-xs font-bold text-slate-400 dark:text-ink-low uppercase tracking-wider mb-3">Por mes</h4>
          <div className="space-y-2">
            {byMonth.map(([m, v]) => (
              <div key={m} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 dark:border-white/[0.06] last:border-0">
                <span className="text-slate-700 dark:text-ink-mid capitalize">{monthLabel(m)}</span>
                <span className="font-mono text-slate-800 dark:text-ink-hi">{fmtCurrency(v)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
