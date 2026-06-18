type MonthFormat = 'long' | 'short' | 'numeric' | '2-digit';

/** Formatea una fecha al locale es-AR. */
export function formatDate(
  date: string | Date | null | undefined,
  monthFormat: MonthFormat = 'long',
): string {
  if (!date) return 'Fecha desconocida';
  try {
    return new Date(date).toLocaleDateString('es-AR', {
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
