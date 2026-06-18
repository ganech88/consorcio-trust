import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { exportToExcel, exportToPdf } from '../lib/export-utils';

/**
 * Botones de exportación a Excel y PDF.
 * @param {object[]} data - Array de filas a exportar
 * @param {{ header: string, key: string }[]} columns - Definición de columnas
 * @param {string} title - Título del PDF / nombre del archivo
 * @param {string} [className] - Clases adicionales al wrapper
 */
export default function ExportButtons({ data, columns, title, className = '' }) {
  const [loadingXls, setLoadingXls] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const fileName = title.toLowerCase().replace(/\s+/g, '-');

  async function handleExcel() {
    if (!data?.length) return;
    setLoadingXls(true);
    try {
      await exportToExcel(data, columns, fileName);
    } catch (e) {
      console.warn('exportToExcel:', e.message);
    } finally {
      setLoadingXls(false);
    }
  }

  async function handlePdf() {
    if (!data?.length) return;
    setLoadingPdf(true);
    try {
      await exportToPdf(data, columns, title, fileName);
    } catch (e) {
      console.warn('exportToPdf:', e.message);
    } finally {
      setLoadingPdf(false);
    }
  }

  if (!data?.length) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs text-slate-400 dark:text-ink-low flex items-center gap-1">
        <Download size={12} /> Exportar:
      </span>
      <button
        onClick={handleExcel}
        disabled={loadingXls}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-400/[0.12] dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 transition-colors disabled:opacity-60"
        title="Exportar a Excel"
      >
        {loadingXls
          ? <Loader2 size={12} className="animate-spin" />
          : <FileSpreadsheet size={12} />}
        Excel
      </button>
      <button
        onClick={handlePdf}
        disabled={loadingPdf}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-50 hover:bg-red-100 dark:bg-red-400/[0.12] dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 transition-colors disabled:opacity-60"
        title="Exportar a PDF"
      >
        {loadingPdf
          ? <Loader2 size={12} className="animate-spin" />
          : <FileText size={12} />}
        PDF
      </button>
    </div>
  );
}
