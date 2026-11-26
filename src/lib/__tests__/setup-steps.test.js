import { describe, it, expect } from 'vitest';
import { buildSetupSteps, setupProgress } from '../setup-steps';

const empty = { unitsCount: 0, coefficientSum: 0, hasPaymentMethod: false, residentsCount: 0, invitesCount: 0, periodsCount: 0 };

describe('buildSetupSteps', () => {
  it('consorcio recién creado: nada hecho, el primer paso es cargar unidades', () => {
    const steps = buildSetupSteps(empty);
    const p = setupProgress(steps);
    expect(p).toMatchObject({ done: 0, total: 5, complete: false });
    expect(p.next.id).toBe('units');
  });

  it('con unidades pero coeficientes que no suman 100 avisa cuánto suman', () => {
    const steps = buildSetupSteps({ ...empty, unitsCount: 4, coefficientSum: 80 });
    const coef = steps.find(s => s.id === 'coefficients');
    expect(steps.find(s => s.id === 'units').done).toBe(true);
    expect(coef.done).toBe(false);
    expect(coef.description).toMatch(/80%/);
  });

  it('acepta el redondeo de coeficientes (99,99 ≈ 100)', () => {
    const steps = buildSetupSteps({ ...empty, unitsCount: 3, coefficientSum: 99.99 });
    expect(steps.find(s => s.id === 'coefficients').done).toBe(true);
  });

  it('invitar cuenta con un código generado o con un vecino ya sumado', () => {
    expect(buildSetupSteps({ ...empty, invitesCount: 1 }).find(s => s.id === 'invite').done).toBe(true);
    expect(buildSetupSteps({ ...empty, residentsCount: 2 }).find(s => s.id === 'invite').done).toBe(true);
  });

  it('todo completo', () => {
    const p = setupProgress(buildSetupSteps({ unitsCount: 10, coefficientSum: 100, hasPaymentMethod: true, residentsCount: 3, invitesCount: 0, periodsCount: 1 }));
    expect(p.complete).toBe(true);
    expect(p.next).toBeNull();
  });
});
