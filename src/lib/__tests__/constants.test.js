import { describe, it, expect } from 'vitest';
import { VIEWS, NAV_ITEMS, NAV_SECTIONS } from '../constants';

describe('constants', () => {
  it('VIEWS has all expected keys', () => {
    expect(VIEWS.DASHBOARD).toBeDefined();
    expect(VIEWS.CLAIMS).toBeDefined();
    expect(VIEWS.ADMIN).toBeDefined();
    expect(VIEWS.SUPER_ADMIN).toBeDefined();
  });

  it('VIEWS values are URL paths', () => {
    Object.values(VIEWS).forEach(value => {
      expect(value).toMatch(/^\//);
    });
  });

  it('NAV_ITEMS have required properties', () => {
    NAV_ITEMS.forEach(item => {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('iconName');
    });
  });

  it('NAV_SECTIONS keys reference valid VIEWS', () => {
    const viewValues = Object.values(VIEWS);
    NAV_SECTIONS.forEach(section => {
      section.keys.forEach(key => {
        expect(viewValues).toContain(key);
      });
    });
  });
});
