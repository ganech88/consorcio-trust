type MonthFormat = 'long' | 'short' | 'numeric' | '2-digit';

/**
 * Convierte a Date sin corrimiento de zona horaria: 'YYYY-MM-DD' (columnas `date`
 * de Postgres) es medianoche LOCAL, no UTC. `new Date('2026-12-10')` en Argentina
 * (UTC-3) cae el 9 a las 21 h y mostraba el vencimiento un día antes.
 */
export function parseLocalDate(value: string | Date | null | undefined): Date {
  if (value instanceof Date) return value;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ''));
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value ?? NaN);
}

/** Fecha corta es-AR (10/12/2026), segura para columnas `date`. */
export function formatShortDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = parseLocalDate(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-AR');
}

/** Formatea una fecha al locale es-AR. */
export function formatDate(
  date: string | Date | null | undefined,
  monthFormat: MonthFormat = 'long',
): string {
  if (!date) return 'Fecha desconocida';
  try {
    return parseLocalDate(date).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: monthFormat,
      year: 'numeric',
    });
  } catch {
    return 'Fecha inválida';
  }
}

/** Formatea un número como moneda ARS. */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  const n = Number(amount);
  if (isNaN(n)) return '—';
  return `$${n.toLocaleString('es-AR')}`;
}
