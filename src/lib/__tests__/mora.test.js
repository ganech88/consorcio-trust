import { describe, it, expect } from 'vitest';
import { computeLateInterest, daysOverdue, amountWithInterest } from '../mora';

const cfg = { late_interest_monthly_pct: 3, late_interest_grace_days: 0 };

describe('daysOverdue', () => {
  it('es 0 antes del vencimiento y el mismo dia', () => {
    expect(daysOverdue('2026-08-10', 0, '2026-08-01')).toBe(0);
    expect(daysOverdue('2026-08-10', 0, '2026-08-10')).toBe(0);
  });
  it('cuenta dias corridos despues del vencimiento', () => {
    expect(daysOverdue('2026-08-10', 0, '2026-08-25')).toBe(15);
  });
  it('descuenta los dias de gracia', () => {
    expect(daysOverdue('2026-08-10', 5, '2026-08-14')).toBe(0);
    expect(daysOverdue('2026-08-10', 5, '2026-08-20')).toBe(5);
  });
  it('no depende del huso horario (fecha YYYY-MM-DD)', () => {
    expect(daysOverdue('2026-08-10', 0, new Date(2026, 7, 11, 23, 59))).toBe(1);
  });
});

describe('computeLateInterest', () => {
  it('es 0 sin tasa configurada', () => {
    expect(computeLateInterest(100000, '2026-01-01', { late_interest_monthly_pct: 0 }, '2026-03-01')).toBe(0);
    expect(computeLateInterest(100000, '2026-01-01', null, '2026-03-01')).toBe(0);
  });
  it('es 0 si no esta vencida', () => {
    expect(computeLateInterest(100000, '2026-08-10', cfg, '2026-08-05')).toBe(0);
  });
  it('un mes de atraso al 3% mensual = 3% del capital', () => {
    expect(computeLateInterest(100000, '2026-08-10', cfg, '2026-09-09')).toBe(3000);
  });
  it('prorratea por dia (15 dias = 1.5%)', () => {
    expect(computeLateInterest(100000, '2026-08-10', cfg, '2026-08-25')).toBe(1500);
  });
  it('redondea a centavos', () => {
    expect(computeLateInterest(33333, '2026-08-10', cfg, '2026-08-11')).toBe(33.33);
  });
  it('acepta strings (como vienen de Postgres)', () => {
    expect(computeLateInterest('100000', '2026-08-10', { late_interest_monthly_pct: '3' }, '2026-09-09')).toBe(3000);
  });
});

describe('amountWithInterest', () => {
  it('devuelve base, interes y total', () => {
    const r = amountWithInterest(100000, '2026-08-10', cfg, '2026-09-09');
    expect(r).toEqual({ base: 100000, interest: 3000, total: 103000, days: 30 });
  });
});
