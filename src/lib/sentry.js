import * as Sentry from '@sentry/react';

// Monitoreo de errores. Se activa solo si VITE_SENTRY_DSN está definido,
// así no afecta entornos sin configurar (dev, demos).
const dsn = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Solo captura de errores; sin tracing ni session replay (bundle liviano).
    tracesSampleRate: 0,
  });
}

export function captureError(error, context) {
  if (!dsn) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
