import { describe, it, expect } from 'vitest';
import { parseUnitsPaste, parseCoefficient } from '../units-import';

describe('parseCoefficient', () => {
  it('acepta coma o punto decimal y el signo %', () => {
    expect(parseCoefficient('4,25')).toBe(4.25);
    expect(parseCoefficient('4.25')).toBe(4.25);
    expect(parseCoefficient(' 4,25 % ')).toBe(4.25);
    expect(parseCoefficient('1.234,5')).toBe(1234.5);
    expect(parseCoefficient('')).toBeNull();
    expect(Number.isNaN(parseCoefficient('abc'))).toBe(true);
  });
});

describe('parseUnitsPaste', () => {
  it('lee filas pegadas desde Excel (tabulaciones) y saltea el encabezado', () => {
    const text = 'Unidad\tPiso\tDepto\tCoeficiente\n1A\t1\tA\t12,5\n1B\t1\tB\t12,5\nPB Local\tPB\t\t25%\n';
    const r = parseUnitsPaste(text);
    expect(r.errors).toEqual([]);
    expect(r.units).toEqual([
      { name: '1A', floor: '1', apartment: 'A', coefficient: 12.5 },
      { name: '1B', floor: '1', apartment: 'B', coefficient: 12.5 },
      { name: 'PB Local', floor: 'PB', apartment: null, coefficient: 25 },
    ]);
    expect(r.coefficientSum).toBe(50);
  });

  it('acepta dos columnas (unidad y coeficiente) con ; o con coma', () => {
    expect(parseUnitsPaste('2A;5,5\n2B;4.5').units.map(u => u.coefficient)).toEqual([5.5, 4.5]);
    expect(parseUnitsPaste('3A, 7.25').units[0]).toMatchObject({ name: '3A', coefficient: 7.25 });
  });

  it('acepta solo el nombre (coeficiente a completar después)', () => {
    expect(parseUnitsPaste('4A\n4B').units).toEqual([
      { name: '4A', floor: null, apartment: null, coefficient: null },
      { name: '4B', floor: null, apartment: null, coefficient: null },
    ]);
  });

  it('informa errores por fila sin frenar el resto', () => {
    const r = parseUnitsPaste('1A\t1\tA\tabc\n1B\t1\tB\t10\n1B\t1\tB\t10\n\t1\tC\t5\n1D\t1\tD\t150');
    expect(r.units.map(u => u.name)).toEqual(['1B']);
    expect(r.errors).toHaveLength(4);
    expect(r.errors[0]).toMatch(/Fila 1 \(1A\)/);
    expect(r.errors[1]).toMatch(/repetida/);
  });

  it('detecta unidades que ya existen en el consorcio (sin distinguir mayúsculas)', () => {
    const r = parseUnitsPaste('1a\t\t\t10\n2A\t\t\t10', ['1A']);
    expect(r.units.map(u => u.name)).toEqual(['2A']);
    expect(r.errors[0]).toMatch(/ya existe/);
  });

  it('rechaza pegados gigantes', () => {
    const r = parseUnitsPaste(Array.from({ length: 501 }, (_, i) => `U${i}`).join('\n'));
    expect(r.units).toEqual([]);
    expect(r.errors[0]).toMatch(/demasiadas filas/);
  });
});
