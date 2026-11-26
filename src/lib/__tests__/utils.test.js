import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate } from '../utils';

describe('formatCurrency', () => {
  it('formatea numeros con separador de miles y signo $', () => {
    const out = formatCurrency(320000);
    expect(out.startsWith('$')).toBe(true);
    expect(out.replace(/\D/g, '')).toBe('320000');
  });

  it('acepta strings numericos', () => {
    expect(formatCurrency('100000').replace(/\D/g, '')).toBe('100000');
  });

  it('devuelve guion para null, undefined o no numerico', () => {
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency(undefined)).toBe('—');
    expect(formatCurrency('abc')).toBe('—');
  });

  it('formatea el cero', () => {
    expect(formatCurrency(0).replace(/\D/g, '')).toBe('0');
  });
});

describe('formatDate', () => {
  it('devuelve placeholder cuando no hay fecha', () => {
    expect(formatDate(null)).toBe('Fecha desconocida');
    expect(formatDate(undefined)).toBe('Fecha desconocida');
  });

  it('incluye el anio para una fecha valida', () => {
    const out = formatDate('2026-06-17');
    expect(typeof out).toBe('string');
    expect(out).toContain('2026');
  });
});

import { parseLocalDate, formatShortDate } from '../utils';

describe('fechas sin corrimiento de zona horaria', () => {
  it("'YYYY-MM-DD' es medianoche local (el vencimiento no se corre un día)", () => {
    const d = parseLocalDate('2026-12-10');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 11, 10, 0]);
    expect(formatShortDate('2026-12-10')).toBe(new Date(2026, 11, 10).toLocaleDateString('es-AR'));
    expect(formatDate('2026-12-10')).toContain('10');
  });

  it('respeta timestamps completos y valores vacíos', () => {
    expect(parseLocalDate('2026-12-10T15:30:00Z').toISOString()).toBe('2026-12-10T15:30:00.000Z');
    expect(formatShortDate(null)).toBe('');
    expect(formatShortDate('no-es-fecha')).toBe('');
  });
});
