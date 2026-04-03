// Edge Function: mp-webhook
// Receives MercadoPago payment notifications and updates expense_payments table

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const body = await req.json();
    const { type, data } = body;

    // Solo procesar notificaciones de pago
    if (type !== 'payment' || !data?.id) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mpPaymentId = String(data.id);

    // Obtener payment info directamente desde MP (necesita el access_token del consorcio)
    // Primero encontrar el registro con este mp_payment_id
    const { data: payment, error: findErr } = await supabase
      .from('expense_payments')
      .select('id, consortium_id, mp_external_reference')
      .eq('mp_payment_id', mpPaymentId)
      .maybeSingle();

    if (findErr) throw findErr;

    // Si no encontramos por mp_payment_id, buscar por external_reference
    // El external_reference tiene formato "consorcio_<consortium_id>_<payment_id>"
    let targetPayment = payment;

    if (!targetPayment && body.resource) {
      // resource es la URL del pago, extraer external_reference del body si viene
      const externalRef = body.external_reference ?? data.external_reference;
      if (externalRef) {
        const { data: byRef } = await supabase
          .from('expense_payments')
          .select('id, consortium_id, mp_external_reference')
          .eq('mp_external_reference', externalRef)
          .maybeSingle();
        targetPayment = byRef;
      }
    }

    if (!targetPayment) {
      return new Response(JSON.stringify({ ok: true, not_found: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Obtener access_token del consorcio para consultar MP
    const { data: mpConfig } = await supabase
      .from('mp_config')
      .select('access_token')
      .eq('consortium_id', targetPayment.consortium_id)
      .eq('enabled', true)
      .maybeSingle();

    let mpStatus = 'pending';

    if (mpConfig?.access_token) {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
        headers: { Authorization: `Bearer ${mpConfig.access_token}` },
      });
      if (mpRes.ok) {
        const mpData = await mpRes.json();
        mpStatus = mpData.status; // approved, rejected, pending, in_process
      }
    }

    // Actualizar el registro
    const updateData: Record<string, unknown> = {
      mp_payment_id: mpPaymentId,
      mp_status: mpStatus,
    };

    if (mpStatus === 'approved') {
      updateData.status = 'paid';
      updateData.paid_at = new Date().toISOString();
    }

    const { error: updateErr } = await supabase
      .from('expense_payments')
      .update(updateData)
      .eq('id', targetPayment.id);

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ ok: true, status: mpStatus }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
