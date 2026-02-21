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
      {/* Header con búsqueda */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
          <FolderOpen size={20} className="text-blue-600" />
          Documentos del Consorcio
        </h3>
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar documento..."
            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50/50"
          />
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-100">
        {filteredDocs.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={48} className="mx-auto text-slate-300 mb-4" />
            <h4 className="font-semibold text-slate-600">No se encontraron documentos</h4>
            <p className="text-slate-400 mt-1 text-sm">Intenta con otra búsqueda</p>
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-4 flex items-center gap-4 hover:bg-slate-50/80 transition-colors group"
            >
              {/* Icon */}
              <div className="bg-red-50 p-3 rounded-xl text-red-500 shrink-0 group-hover:bg-red-100 transition-colors">
                <FileText size={22} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">
                  {doc.name}.{doc.type}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Subido el {doc.date}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDownload(doc)}
                  className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                  aria-label={`Ver ${doc.name}`}
                  title="Ver"
                >
                  <Eye size={18} />
                </button>
                <button
                  onClick={() => handleDownload(doc)}
                  className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
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
