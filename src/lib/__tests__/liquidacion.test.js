import { describe, it, expect } from 'vitest';
import { distributeByCoefficient } from '../liquidacion';

const u = (id, coefficient, extra = {}) => ({ id, name: id.toUpperCase(), coefficient, ...extra });

describe('distributeByCoefficient', () => {
  it('reparte segun coeficiente y cierra exacto con el total', () => {
    const r = distributeByCoefficient(100000, [u('1a', 40), u('1b', 35), u('2a', 25)]);
    expect(r.rows.map(x => x.amount)).toEqual([40000, 35000, 25000]);
    expect(r.distributed).toBe(100000);
    expect(r.undistributed).toBe(0);
    expect(r.coefficientOk).toBe(true);
  });

  it('corrige el desvio de redondeo en la ultima unidad', () => {
    // 3 x 33.33% de 100 = 99.99 -> ajusta 0.01 en la ultima
    const r = distributeByCoefficient(100, [u('a', 33.33), u('b', 33.33), u('c', 33.34)]);
    expect(r.rows.reduce((s, x) => s + x.amount, 0)).toBeCloseTo(100, 2);
    expect(r.distributed).toBe(100);
  });

  it('excluye unidades sin coeficiente o con 0 y reporta lo no distribuido', () => {
    const r = distributeByCoefficient(100000, [u('a', 50), u('b', 0), u('c', null)]);
    expect(r.rows).toHaveLength(1);
    expect(r.excluded.map(x => x.id)).toEqual(['b', 'c']);
    expect(r.coefficientOk).toBe(false);
    expect(r.undistributed).toBe(50000);
  });

  it('no fuerza el cierre si los coeficientes no suman 100', () => {
    const r = distributeByCoefficient(100000, [u('a', 60), u('b', 30)]);
    expect(r.rows.map(x => x.amount)).toEqual([60000, 30000]);
    expect(r.sumCoefficient).toBe(90);
    expect(r.undistributed).toBe(10000);
  });

  it('asigna el cargo al propietario o, si no hay, al inquilino', () => {
    const r = distributeByCoefficient(100, [u('a', 50, { owner_id: 'own' }), u('b', 50, { tenant_id: 'ten' })]);
    expect(r.rows.map(x => x.user_id)).toEqual(['own', 'ten']);
  });

  it('acepta coeficientes como string (Postgres numeric)', () => {
    const r = distributeByCoefficient('1000', [u('a', '25'), u('b', '75')]);
    expect(r.rows.map(x => x.amount)).toEqual([250, 750]);
  });
});
