/**
 * Formatea una fecha ISO al locale es-AR.
 * @param {string|Date|null} date
 * @param {'long'|'short'|'numeric'} monthFormat - formato del mes
 * @returns {string}
 */
export function formatDate(date, monthFormat = 'long') {
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

/**
 * Formatea un número como moneda ARS.
 * @param {number|string|null} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '—';
  const n = Number(amount);
  if (isNaN(n)) return '—';
  return `$${n.toLocaleString('es-AR')}`;
}
