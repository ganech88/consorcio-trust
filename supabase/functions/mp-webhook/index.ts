// Edge Function: mp-webhook
// Recibe notificaciones de pago de MercadoPago, valida la firma (x-signature),
// consulta el pago en MP con el access_token del consorcio, valida el MONTO
// contra lo registrado server-side y concilia: payments -> expense_period_items.
//
// Seguridad:
//  - FAIL-CLOSED: si falta MP_WEBHOOK_SECRET responde 503 (nunca acepta sin firma).
//  - El estado se toma SIEMPRE de la API de MP, nunca del body del webhook.
//  - Idempotente: payments.mp_payment_id es UNIQUE; un reintento no duplica.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function validSignature(req: Request, urlDataId: string | null, secret: string): Promise<boolean> {
  const xSig = req.headers.get('x-signature') || '';
  const xReqId = req.headers.get('x-request-id') || '';
  const parts: Record<string, string> = {};
  for (const p of xSig.split(',')) { const [k, v] = p.split('='); if (k && v) parts[k.trim()] = v.trim(); }
  const ts = parts['ts']; const v1 = parts['v1'];
  if (!ts || !v1) return false;
  // Ventana anti-replay: 15 minutos
  const tsNum = Number(ts);
  if (Number.isFinite(tsNum) && Math.abs(Date.now() - (tsNum > 1e12 ? tsNum : tsNum * 1000)) > 15 * 60 * 1000) return false;
  const manifest = `id:${urlDataId ?? ''};request-id:${xReqId};ts:${ts};`;
  return timingSafeEqual(await hmacHex(secret, manifest), v1);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const secret = Deno.env.get('MP_WEBHOOK_SECRET') || '';
  if (!secret) {
    console.error('MP_WEBHOOK_SECRET no configurado: webhook deshabilitado (fail-closed).');
    return json({ error: 'webhook no configurado' }, 503);
  }

  try {
    const url = new URL(req.url);
    const urlDataId = url.searchParams.get('data.id') || url.searchParams.get('id');
    if (!(await validSignature(req, urlDataId, secret))) return json({ error: 'firma invalida' }, 401);

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const body = await req.json().catch(() => ({}));
    const { type, data } = body;
    const mpPaymentId = String(data?.id ?? urlDataId ?? '');
    if ((type && type !== 'payment') || !mpPaymentId) return json({ ok: true, skipped: true });

    // 1) Buscar el pago local (por mp_payment_id si ya lo vimos, o por external_reference)
    let { data: payment } = await supabase.from('payments')
      .select('id, amount, status, mp_external_reference, period_item_id')
      .eq('mp_payment_id', mpPaymentId).maybeSingle();

    // El external_reference lo conocemos recién al consultar MP; por eso primero
    // resolvemos el consorcio desde la propia notificación (ref en el body si viene)
    // o, si no, probamos con todos los tokens habilitados hasta encontrar el pago.
    let accessToken: string | null = null;
    let externalRef: string | null = body.external_reference ?? data?.external_reference ?? payment?.mp_external_reference ?? null;
    const consortiumFromRef = (ref: string | null) => (ref && ref.startsWith('consorcio_')) ? ref.split('_')[1] : null;

    let cid = consortiumFromRef(externalRef);
    if (cid) {
      const { data: mp } = await supabase.from('mp_config').select('access_token').eq('consortium_id', cid).eq('enabled', true).maybeSingle();
      accessToken = mp?.access_token ?? null;
    }

    let mpData: any = null;
    if (accessToken) {
      const r = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (r.ok) mpData = await r.json();
    } else {
      // Sin referencia: probamos los tokens habilitados (pocos consorcios; barato).
      const { data: cfgs } = await supabase.from('mp_config').select('consortium_id, access_token').eq('enabled', true);
      for (const c of cfgs ?? []) {
        const r = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, { headers: { Authorization: `Bearer ${c.access_token}` } });
        if (r.ok) { mpData = await r.json(); cid = c.consortium_id; break; }
      }
    }
    if (!mpData) return json({ ok: true, not_found: true });

    externalRef = mpData.external_reference ?? externalRef;
    if (!payment && externalRef) {
      const { data: byRef } = await supabase.from('payments')
        .select('id, amount, status, mp_external_reference, period_item_id')
        .eq('mp_external_reference', externalRef).maybeSingle();
      payment = byRef;
    }
    if (!payment) return json({ ok: true, not_found: true });
    // El pago debe pertenecer al consorcio cuyo token respondió
    if (consortiumFromRef(payment.mp_external_reference) !== cid) return json({ error: 'referencia no coincide' }, 400);

    const mpStatus: string = mpData.status ?? 'pending';
    const paidAmount = Number(mpData.transaction_amount ?? 0);
    const expected = Number(payment.amount ?? 0);

    const updateData: Record<string, unknown> = { mp_payment_id: mpPaymentId, mp_status: mpStatus };
    if (mpStatus === 'approved') {
      if (paidAmount + 0.01 < expected) {
        // Pago menor a lo esperado: NO se aprueba. Queda para revisión manual del admin.
        updateData.status = 'pending';
        updateData.notes = `MP aprobó ${paidAmount} pero se esperaban ${expected}. Revisar.`;
      } else if (payment.status !== 'approved') {
        updateData.status = 'approved';
        updateData.paid_at = mpData.date_approved ?? new Date().toISOString();
        updateData.approved_at = new Date().toISOString();
      }
    } else if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(mpStatus) && payment.status !== 'approved') {
      updateData.status = 'rejected';
    }

    const { error: updateErr } = await supabase.from('payments').update(updateData).eq('id', payment.id);
    if (updateErr) {
      // 23505 = otro reintento ya asoció este mp_payment_id: idempotente.
      if ((updateErr as any).code === '23505') return json({ ok: true, duplicate: true });
      throw updateErr;
    }
    // La conciliación (marcar el item de período como pagado) la hace el trigger
    // trg_payments_reconcile en la DB cuando payments.status pasa a 'approved'.
    return json({ ok: true, status: mpStatus });
  } catch (err) {
    console.error('mp-webhook error', err);
    return json({ error: 'error interno' }, 500);
  }
});
