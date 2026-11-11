// Decisión pura del webhook de MercadoPago: dado el pago local y lo que informa la
// API de MP, qué columnas de `payments` hay que actualizar. Sin imports para poder
// testearla con vitest (src/lib/__tests__/mp-webhook-decide.test.js).
//
// Reglas:
//  - approved + monto suficiente  -> 'approved' (aunque el checkout hubiera vencido).
//  - approved + monto menor       -> 'pending' con nota (revisión manual del admin).
//    Nunca des-aprueba un pago que el admin ya aprobó.
//  - refunded / charged_back      -> 'rejected' SIEMPRE, también si estaba aprobado:
//    el trigger reconcile_payment (077) reabre el cargo que había saldado.
//  - rejected / cancelled         -> 'rejected' salvo que ya esté aprobado.
//  - devolución parcial           -> solo nota (MP mantiene status 'approved').

export interface LocalPayment { status: string; amount: number | string | null }
export interface MpPayment {
  status?: string | null;
  transaction_amount?: number | null;
  transaction_amount_refunded?: number | null;
  date_approved?: string | null;
}
export interface DecideOptions {
  /** ISO timestamp actual (inyectable para tests). */
  now: string;
  /** El cargo vinculado ya está saldado por otro pago aprobado. */
  chargeAlreadySettled?: boolean;
}

export function decidePaymentUpdate(payment: LocalPayment, mp: MpPayment, opts: DecideOptions): Record<string, unknown> {
  const mpStatus = mp.status ?? 'pending';
  const paid = Number(mp.transaction_amount ?? 0);
  const refunded = Number(mp.transaction_amount_refunded ?? 0);
  const expected = Number(payment.amount ?? 0);
  const wasApproved = payment.status === 'approved';
  const out: Record<string, unknown> = { mp_status: mpStatus };

  if (mpStatus === 'approved') {
    if (wasApproved) {
      if (refunded > 0) out.notes = `MercadoPago informó una devolución parcial de ${refunded}. Revisar.`;
    } else if (paid + 0.01 < expected) {
      out.status = 'pending';
      out.notes = `MP aprobó ${paid} pero se esperaban ${expected}. Revisar.`;
    } else {
      out.status = 'approved';
      out.paid_at = mp.date_approved ?? opts.now;
      out.approved_at = opts.now;
      if (opts.chargeAlreadySettled) out.notes = 'Posible pago duplicado: el cargo ya estaba saldado por otro pago. Revisar.';
    }
  } else if (mpStatus === 'refunded' || mpStatus === 'charged_back') {
    out.status = 'rejected';
    if (wasApproved) {
      out.notes = mpStatus === 'charged_back'
        ? 'Contracargo en MercadoPago: el pago se anuló y el cargo volvió a quedar pendiente.'
        : 'Pago devuelto en MercadoPago: el pago se anuló y el cargo volvió a quedar pendiente.';
    }
  } else if ((mpStatus === 'rejected' || mpStatus === 'cancelled') && !wasApproved) {
    out.status = 'rejected';
  }
  return out;
}
