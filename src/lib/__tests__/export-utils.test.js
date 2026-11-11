import { describe, it, expect } from 'vitest';
import { sanitizeCellValue } from '../export-utils';

describe('sanitizeCellValue', () => {
  it('neutraliza celdas que Excel interpretaria como formula', () => {
    for (const v of ['=1+1', '+54 11 5555', '-10', '@SUM(A1)']) {
      expect(sanitizeCellValue(v)).toBe(`'${v}`);
    }
  });

  it('no toca texto comun ni valores no string', () => {
    expect(sanitizeCellValue('Expensas marzo')).toBe('Expensas marzo');
    expect(sanitizeCellValue(-10)).toBe(-10);
    expect(sanitizeCellValue(null)).toBe(null);
  });
});
