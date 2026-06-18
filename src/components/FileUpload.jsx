import { useState, useRef, useEffect } from 'react';
import { Paperclip, X, Loader2, FileText, ExternalLink, Upload } from 'lucide-react';
import { uploadAttachment, getSignedComprobanteUrl } from '../services/data.service';

const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';
const MAX_MB = 10;

export default function FileUpload({
  value,          // URL actual del adjunto
  onChange,       // (url | null) => void — llamado al subir o borrar
  folder = 'general',
  label = 'Adjuntar archivo',
  disabled = false,
  className = '',
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const [displayUrl, setDisplayUrl] = useState(null);

  useEffect(() => {
    let alive = true;
    if (value) getSignedComprobanteUrl(value).then((u) => { if (alive) setDisplayUrl(u); });
    else setDisplayUrl(null);
    return () => { alive = false; };
  }, [value]);

  const isPdf = value && value.toLowerCase().includes('.pdf');
  const isImage = value && !isPdf;

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`El archivo supera ${MAX_MB} MB`);
      return;
    }
    setError('');
    setUploading(true);
    try {
      const url = await uploadAttachment(file, folder);
      onChange(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleRemove() {
    onChange(null);
    setError('');
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {!value ? (
        <label className={`flex items-center gap-2 cursor-pointer w-fit ${disabled || uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            onChange={handleFile}
            className="hidden"
            disabled={disabled || uploading}
          />
          <div className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-slate-300 dark:border-white/[0.09] rounded-xl hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/10 transition-colors text-sm text-slate-500 dark:text-ink-mid">
            {uploading ? (
              <Loader2 size={15} className="animate-spin text-brand-500" />
            ) : (
              <Upload size={15} />
            )}
            <span>{uploading ? 'Subiendo...' : label}</span>
          </div>
        </label>
      ) : (
        <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-surface-inset border border-slate-200 dark:border-white/[0.09] rounded-xl">
          {isImage ? (
            <a href={displayUrl || undefined} target="_blank" rel="noopener noreferrer" className="shrink-0">
              <img
                src={displayUrl || undefined}
                alt="adjunto"
                className="w-12 h-12 object-cover rounded-lg border border-slate-200 dark:border-white/[0.09]"
              />
            </a>
          ) : (
            <div className="w-12 h-12 flex items-center justify-center bg-red-50 dark:bg-red-400/[0.12] rounded-lg border border-red-200 dark:border-red-800 shrink-0">
              <FileText size={22} className="text-red-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 dark:text-ink-mid truncate">
              {isPdf ? 'Documento PDF' : 'Imagen adjunta'}
            </p>
            <a
              href={displayUrl || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5"
            >
              Ver archivo <ExternalLink size={10} />
            </a>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
              title="Quitar adjunto"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <X size={12} /> {error}
        </p>
      )}
    </div>
  );
}
