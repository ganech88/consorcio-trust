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
