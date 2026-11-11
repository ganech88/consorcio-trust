import { describe, it, expect, vi, afterEach } from 'vitest';
import { clearUserDataCaches, USER_DATA_CACHES } from '../sw-cache';

afterEach(() => { vi.unstubAllGlobals(); });

describe('clearUserDataCaches', () => {
  it('borra todas las caches con datos del usuario', async () => {
    const del = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('caches', { delete: del });
    await clearUserDataCaches();
    expect(del.mock.calls.map(c => c[0])).toEqual(USER_DATA_CACHES);
  });

  it('no lanza si Cache Storage falla o no existe', async () => {
    vi.stubGlobal('caches', { delete: vi.fn().mockRejectedValue(new Error('denied')) });
    await expect(clearUserDataCaches()).resolves.toBeUndefined();
    vi.stubGlobal('caches', undefined);
    await expect(clearUserDataCaches()).resolves.toBeUndefined();
  });
});
