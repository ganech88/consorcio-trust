import { useState, useEffect, useRef } from 'react';
import { Building2, ChevronDown, Check, Loader2 } from 'lucide-react';
import { fetchAdminConsortia, switchActiveConsortium } from '../services/data.service';

export default function ConsortiumSwitcher({ userProfile, onSwitch }) {
  const [consortia, setConsortia] = useState([]);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef(null);

  const isMulti = ['admin', 'super_admin'].includes(userProfile?.role);

  useEffect(() => {
    if (!isMulti || !userProfile?.id) return;
    fetchAdminConsortia(userProfile.id)
      .then(list => {
        // Asegurarse que el consorcio actual esté en la lista
        if (list.length === 0 && userProfile.consortium_id) {
          setConsortia([{ id: userProfile.consortium_id, name: 'Consorcio actual' }]);
        } else {
          setConsortia(list);
        }
      })
      .catch(() => {});
  }, [userProfile?.id, isMulti, userProfile?.consortium_id]);

  // Cerrar al clickear fuera
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!isMulti || consortia.length <= 1) {
    // Solo mostrar nombre, sin switcher
    return (
      <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-ink-mid px-2">
        <Building2 size={13} />
        <span className="truncate max-w-[140px]">
          {consortia[0]?.name || userProfile?.consortium_id?.slice(0, 8) || 'Consorcio'}
        </span>
      </div>
    );
  }

  const current = consortia.find(c => c.id === userProfile.consortium_id) || consortia[0];

  async function handleSelect(consortium) {
    if (consortium.id === userProfile.consortium_id) { setOpen(false); return; }
    setSwitching(true);
    setOpen(false);
    try {
      const updated = await switchActiveConsortium(userProfile.id, consortium.id);
      onSwitch(updated);
    } catch (e) {
      console.error('Error al cambiar consorcio:', e);
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-surface-panel2 hover:bg-slate-200 dark:hover:bg-white/[0.07] text-xs font-semibold text-slate-700 dark:text-ink-hi transition-colors max-w-[200px]"
        disabled={switching}
      >
        {switching ? (
          <Loader2 size={12} className="animate-spin shrink-0" />
        ) : (
          <Building2 size={12} className="shrink-0 text-brand-500" />
        )}
        <span className="truncate">{current?.name || 'Consorcio'}</span>
        <ChevronDown size={12} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-surface-panel rounded-xl shadow-xl border border-slate-200 dark:border-white/[0.07] z-50 overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-ink-low px-3 pt-2.5 pb-1">
            Tus consorcios
          </p>
          {consortia.map(c => (
            <button
              key={c.id}
              onClick={() => handleSelect(c)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors text-left"
            >
              <div className="w-6 h-6 rounded-lg bg-brand-100 dark:bg-brand-400/[0.14] flex items-center justify-center shrink-0">
                <Building2 size={12} className="text-brand-600 dark:text-brand-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-ink-hi truncate">{c.name}</p>
                {c.city && <p className="text-xs text-slate-400 dark:text-ink-low truncate">{c.city}</p>}
              </div>
              {c.id === userProfile.consortium_id && (
                <Check size={14} className="text-brand-600 dark:text-brand-400 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
