import { describe, it, expect } from 'vitest';
import { hasUnseenNotifications } from '../notifications';

const t = (iso) => Date.parse(iso);

describe('hasUnseenNotifications', () => {
  it('sin novedades posteriores a la última apertura no hay punto rojo', () => {
    const lists = [[{ created_at: '2026-11-01T10:00:00Z' }], [{ created_at: '2026-11-02T10:00:00Z' }]];
    expect(hasUnseenNotifications(lists, t('2026-11-03T00:00:00Z'))).toBe(false);
  });

  it('una novedad más nueva lo enciende (usa updated_at si existe)', () => {
    expect(hasUnseenNotifications([[{ created_at: '2026-11-05T10:00:00Z' }]], t('2026-11-03T00:00:00Z'))).toBe(true);
    expect(hasUnseenNotifications([[{ created_at: '2026-11-01T10:00:00Z', updated_at: '2026-11-06T10:00:00Z' }]], t('2026-11-03T00:00:00Z'))).toBe(true);
  });

  it('tolera listas vacías, nulas y fechas inválidas', () => {
    expect(hasUnseenNotifications([null, undefined, [], [{ created_at: 'x' }, {}]], 0)).toBe(false);
  });

  it('la primera vez (nunca abrió) cualquier novedad cuenta', () => {
    expect(hasUnseenNotifications([[{ created_at: '2026-01-01T00:00:00Z' }]], 0)).toBe(true);
  });
});
