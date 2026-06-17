// Edge Function: mp-webhook
// Recibe notificaciones de pago de MercadoPago, valida la firma (x-signature)
// y actualiza expense_payments.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Valida la firma de MercadoPago. Si MP_WEBHOOK_SECRET no esta configurado,
// no bloquea (para no romper antes de configurarlo) pero deja un warning.
async function validSignature(req: Request, urlDataId: string | null): Promise<boolean> {
  const secret = Deno.env.get('MP_WEBHOOK_SECRET') || '';
  if (!secret) { console.warn('MP_WEBHOOK_SECRET no configurado: el webhook NO esta validando firma.'); return true; }
  const xSig = req.headers.get('x-signature') || '';
  const xReqId = req.headers.get('x-request-id') || '';
  const parts: Record<string, string> = {};
  for (const p of xSig.split(',')) { const [k, v] = p.split('='); if (k && v) parts[k.trim()] = v.trim(); }
  const ts = parts['ts']; const v1 = parts['v1'];
  if (!ts || !v1) return false;
  const manifest = `id:${urlDataId};request-id:${xReqId};ts:${ts};`;
  return (await hmacHex(secret, manifest)) === v1;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const urlDataId = url.searchParams.get('data.id') || url.searchParams.get('id');
    if (!(await validSignature(req, urlDataId))) {
      return new Response(JSON.stringify({ error: 'firma invalida' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const body = await req.json().catch(() => ({}));
    const { type, data } = body;
    const mpPaymentId = String(data?.id ?? urlDataId ?? '');
    if ((type && type !== 'payment') || !mpPaymentId) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    let { data: payment } = await supabase.from('expense_payments').select('id, mp_external_reference').eq('mp_payment_id', mpPaymentId).maybeSingle();
    const externalRef = body.external_reference ?? data?.external_reference;
    if (!payment && externalRef) {
      const { data: byRef } = await supabase.from('expense_payments').select('id, mp_external_reference').eq('mp_external_reference', externalRef).maybeSingle();
      payment = byRef;
    }
    let accessToken: string | null = null;
    const refToParse = payment?.mp_external_reference ?? externalRef;
    if (refToParse && String(refToParse).startsWith('consorcio_')) {
      const cid = String(refToParse).split('_')[1];
      const { data: mp } = await supabase.from('mp_config').select('access_token').eq('consortium_id', cid).eq('enabled', true).maybeSingle();
      accessToken = mp?.access_token ?? null;
    }
    let mpStatus = 'pending';
    if (accessToken) {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (mpRes.ok) { const mpData = await mpRes.json(); mpStatus = mpData.status; }
    }
    if (!payment) {
      return new Response(JSON.stringify({ ok: true, not_found: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const updateData: Record<string, unknown> = { mp_payment_id: mpPaymentId, mp_status: mpStatus };
    if (mpStatus === 'approved') { updateData.status = 'approved'; updateData.paid_at = new Date().toISOString(); }
    const { error: updateErr } = await supabase.from('expense_payments').update(updateData).eq('id', payment.id);
    if (updateErr) throw updateErr;
    return new Response(JSON.stringify({ ok: true, status: mpStatus }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
