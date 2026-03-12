import { FileText, Download, Eye, Search, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { DOCUMENTS_LIST } from '../lib/constants';
import { useToast } from './Toast';

export default function DocsView() {
  const [search, setSearch] = useState('');
  const toast = useToast();

  const filteredDocs = DOCUMENTS_LIST.filter((doc) =>
    doc.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleDownload(doc) {
    toast.info(`Descarga de "${doc.name}" próximamente disponible`, 'Función en desarrollo');
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <h3 className="font-bold text-lg flex items-center gap-2 mb-4 text-slate-800 dark:text-slate-100">
          <FolderOpen size={20} className="text-blue-600 dark:text-blue-400" />
          Documentos del Consorcio
        </h3>
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar documento..."
            className="w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50/50 dark:bg-slate-700 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
        {filteredDocs.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
            <h4 className="font-semibold text-slate-600 dark:text-slate-300">No se encontraron documentos</h4>
            <p className="text-slate-400 dark:text-slate-500 mt-1 text-sm">Intenta con otra búsqueda</p>
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-4 flex items-center gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors group"
            >
              <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-xl text-red-500 dark:text-red-400 shrink-0 group-hover:bg-red-100 dark:group-hover:bg-red-900/50 transition-colors">
                <FileText size={22} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                  {doc.name}.{doc.type}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Subido el {doc.date}</p>
              </div>

              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDownload(doc)}
                  className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-600 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  aria-label={`Ver ${doc.name}`}
                  title="Ver"
                >
                  <Eye size={18} />
                </button>
                <button
                  onClick={() => handleDownload(doc)}
                  className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-600 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  aria-label={`Descargar ${doc.name}`}
                  title="Descargar"
                >
                  <Download size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
