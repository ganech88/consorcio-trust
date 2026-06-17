import { useEffect, useState } from 'react';
import { getSignedComprobanteUrl } from '../services/data.service';

// Enlace a un comprobante del bucket privado: resuelve una signed URL a partir
// del path almacenado. Acepta tambien URLs completas (compatibilidad).
export default function ComprobanteLink({ path, className, children }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let alive = true;
    if (path) getSignedComprobanteUrl(path).then((u) => { if (alive) setUrl(u); });
    else setUrl(null);
    return () => { alive = false; };
  }, [path]);

  if (!path) return null;

  return (
    <a
      href={url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => { if (!url) e.preventDefault(); }}
      className={className}
    >
      {children}
    </a>
  );
}
