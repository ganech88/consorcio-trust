import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initSentry } from './lib/sentry'

initSentry()

// Auto-recuperacion ante "chunk viejo" tras un deploy: si un import dinamico
// (ruta lazy) falla porque el index cacheado pide un chunk que ya no existe,
// recargamos UNA vez para tomar los assets nuevos. Evita el "Algo salio mal".
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', () => {
    const last = Number(sessionStorage.getItem('ct-chunk-reload') || 0);
    if (Date.now() - last > 10000) {
      sessionStorage.setItem('ct-chunk-reload', String(Date.now()));
      window.location.reload();
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
