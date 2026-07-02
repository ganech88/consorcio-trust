import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ children, onClose, title }) {
  const dialogRef = useRef(null);

  // Cerrar con Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevenir scroll del body (compensando el ancho de la scrollbar para evitar salto de layout)
  useEffect(() => {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, []);

  // Enfocar el modal al abrir y devolver el foco al elemento anterior al cerrar (accesibilidad)
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    dialogRef.current?.focus();
    return () => {
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="bg-white dark:bg-surface-panel rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in outline-none"
      >
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 flex justify-between items-center text-white">
          <h3 className="font-bold text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="hover:bg-white/10 rounded-lg p-1 transition-colors"
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
