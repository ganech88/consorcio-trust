import { useState, useEffect } from 'react';
import { FileText, Download, Eye, Search, FolderOpen, Loader2 } from 'lucide-react';
import { fetchConsortiumDocuments } from '../services/data.service';
import { useData } from '../context/DataContext';

const CATEGORIES = [
  { value: 'all',          label: 'Todos' },
  { value: 'reglamentos',  label: 'Reglamentos' },
  { value: 'actas',        label: 'Actas' },
  { value: 'expensas',     label: 'Expensas' },
  { value: 'seguros',      label: 'Seguros' },
  { value: 'general',      label: 'General' },
];

function downloadFile(url, name) {
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.pdf`;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.click();
}

export default function DocsView() {
  const { userProfile } = useData();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    fetchConsortiumDocuments(userProfile?.consortium_id)
      .then(setDocs)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = docs.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'all' || doc.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Cantidad de docs por categoría para mostrar en badges
  const countByCategory = (cat) =>
    cat === 'all' ? docs.length : docs.filter(d => d.category === cat).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header + buscador */}
      <div className="bg-white dark:bg-surface-panel p-6 rounded-2xl border border-slate-100 dark:border-white/[0.07]">
        <h3 className="font-bold text-lg flex items-center gap-2 mb-4 text-slate-800 dark:text-ink-hi">
          <FolderOpen size={20} className="text-blue-600 dark:text-brand-400" />
          Documentos del Consorcio
        </h3>
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-ink-low" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar documento..."
            className="w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-white/[0.09] rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50/50 dark:bg-surface-panel2 dark:text-ink-hi"
          />
        </div>
      </div>

      {/* Filtro por categoría */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeCategory === cat.value
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-surface-panel text-slate-600 dark:text-ink-mid border border-slate-200 dark:border-white/[0.07] hover:bg-slate-50 dark:hover:bg-white/[0.06]'
            }`}
          >
            {cat.label}
            <span className={`text-[10px] ${activeCategory === cat.value ? 'text-blue-200' : 'text-slate-400 dark:text-ink-low'}`}>
              ({countByCategory(cat.value)})
            </span>
          </button>
        ))}
      </div>

      {/* Lista de documentos */}
      <div className="bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] overflow-hidden divide-y divide-slate-100 dark:divide-white/[0.06]">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
            <h4 className="font-semibold text-slate-600 dark:text-ink-mid">
              {docs.length === 0 ? 'No hay documentos disponibles' : 'No se encontraron documentos'}
            </h4>
            <p className="text-slate-400 dark:text-ink-low mt-1 text-sm">
              {docs.length === 0
                ? 'La administración aún no subió documentos'
                : 'Intentá con otra búsqueda o categoría'}
            </p>
          </div>
        ) : (
          filtered.map(doc => (
            <div
              key={doc.id}
              className="p-4 flex items-center gap-4 hover:bg-slate-50/80 dark:hover:bg-white/[0.05] transition-colors group"
            >
              <div className="bg-red-50 dark:bg-red-400/[0.14] p-3 rounded-xl text-red-500 dark:text-red-400 shrink-0 group-hover:bg-red-100 dark:group-hover:bg-red-900/50 transition-colors">
                <FileText size={22} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-ink-hi truncate group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                  {doc.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {doc.category && doc.category !== 'general' && (
                    <span className="text-[10px] bg-slate-100 dark:bg-surface-panel2 text-slate-500 dark:text-ink-mid px-1.5 py-0.5 rounded capitalize">
                      {CATEGORIES.find(c => c.value === doc.category)?.label ?? doc.category}
                    </span>
                  )}
                  <p className="text-xs text-slate-400 dark:text-ink-low">
                    {new Date(doc.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-white/[0.07] text-slate-400 dark:text-ink-low hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  aria-label={`Ver ${doc.name}`}
                  title="Ver"
                >
                  <Eye size={18} />
                </a>
                <button
                  onClick={() => downloadFile(doc.file_url, doc.name)}
                  className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-white/[0.07] text-slate-400 dark:text-ink-low hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
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
