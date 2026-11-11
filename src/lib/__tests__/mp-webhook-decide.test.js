import { describe, it, expect } from 'vitest';
import { decidePaymentUpdate } from '../../../supabase/functions/mp-webhook/decide.ts';

const now = '2026-11-10T12:00:00.000Z';
const decide = (payment, mp, extra = {}) => decidePaymentUpdate(payment, mp, { now, ...extra });

describe('decidePaymentUpdate (mp-webhook)', () => {
  it('aprueba cuando MP acredita el monto esperado', () => {
    const out = decide({ status: 'pending', amount: 1000 }, { status: 'approved', transaction_amount: 1000, date_approved: '2026-11-10T11:00:00Z' });
    expect(out).toMatchObject({ status: 'approved', mp_status: 'approved', paid_at: '2026-11-10T11:00:00Z', approved_at: now });
    expect(out.notes).toBeUndefined();
  });

  it('aprueba un checkout que ya habia vencido (rejected -> approved)', () => {
    expect(decide({ status: 'rejected', amount: 1000 }, { status: 'approved', transaction_amount: 1000 }).status).toBe('approved');
  });

  it('pago menor al esperado queda pendiente para revision', () => {
    const out = decide({ status: 'pending', amount: 1000 }, { status: 'approved', transaction_amount: 1 });
    expect(out.status).toBe('pending');
    expect(out.notes).toMatch(/Revisar/);
  });

  it('un reintento con monto menor no des-aprueba un pago ya aprobado', () => {
    const out = decide({ status: 'approved', amount: 1000 }, { status: 'approved', transaction_amount: 1 });
    expect(out.status).toBeUndefined();
  });

  it('reintento de un pago ya aprobado no cambia el estado', () => {
    expect(decide({ status: 'approved', amount: 1000 }, { status: 'approved', transaction_amount: 1000 })).toEqual({ mp_status: 'approved' });
  });

  it('reembolso o contracargo anula un pago ya aprobado', () => {
    for (const s of ['refunded', 'charged_back']) {
      const out = decide({ status: 'approved', amount: 1000 }, { status: s, transaction_amount: 1000 });
      expect(out.status).toBe('rejected');
      expect(out.mp_status).toBe(s);
      expect(out.notes).toBeTruthy();
    }
  });

  it('rechazo o cancelacion no toca un pago aprobado', () => {
    expect(decide({ status: 'approved', amount: 1000 }, { status: 'cancelled' }).status).toBeUndefined();
    expect(decide({ status: 'pending', amount: 1000 }, { status: 'rejected' }).status).toBe('rejected');
  });

  it('devolucion parcial solo deja una nota', () => {
    const out = decide({ status: 'approved', amount: 1000 }, { status: 'approved', transaction_amount: 1000, transaction_amount_refunded: 200 });
    expect(out.status).toBeUndefined();
    expect(out.notes).toMatch(/200/);
  });

  it('avisa de un posible pago duplicado', () => {
    const out = decide({ status: 'pending', amount: 1000 }, { status: 'approved', transaction_amount: 1000 }, { chargeAlreadySettled: true });
    expect(out.status).toBe('approved');
    expect(out.notes).toMatch(/duplicado/);
  });

  it('estados intermedios solo actualizan mp_status', () => {
    expect(decide({ status: 'pending', amount: 1000 }, { status: 'in_process' })).toEqual({ mp_status: 'in_process' });
  });
});
