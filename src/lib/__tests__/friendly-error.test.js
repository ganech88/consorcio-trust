import { describe, it, expect } from 'vitest';
import { friendlyError } from '../friendly-error';

describe('friendlyError', () => {
  it('traduce los errores de login de Supabase', () => {
    expect(friendlyError('Invalid login credentials')).toMatch(/contraseña no son correctos/);
    expect(friendlyError({ message: 'Email not confirmed' })).toMatch(/confirmaste tu email/);
    expect(friendlyError('User already registered')).toMatch(/Ya existe una cuenta/);
    expect(friendlyError('Password should be at least 8 characters.')).toMatch(/muy corta/);
  });

  it('traduce errores de base y de red', () => {
    expect(friendlyError('new row violates row-level security policy for table "units"')).toMatch(/permiso/);
    expect(friendlyError('duplicate key value violates unique constraint "x"')).toMatch(/Ya existe/);
    expect(friendlyError('TypeError: Failed to fetch')).toMatch(/conexión/);
    expect(friendlyError('update or delete on table "units" violates foreign key constraint')).toMatch(/datos asociados/);
  });

  it('deja pasar los mensajes que ya están en castellano', () => {
    expect(friendlyError('El pago ya fue procesado.')).toBe('El pago ya fue procesado.');
    expect(friendlyError('La expensa no pertenece a tu unidad')).toBe('La expensa no pertenece a tu unidad');
  });

  it('usa un genérico cuando no hay mensaje', () => {
    for (const v of [undefined, null, '', {}, { message: 42 }]) {
      expect(friendlyError(v)).toMatch(/error inesperado/);
    }
  });
});
