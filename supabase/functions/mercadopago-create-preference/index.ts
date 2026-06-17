// Edge Function: mercadopago-create-preference
// Crea una preferencia de pago de MercadoPago con el access_token del consorcio
// y registra un expense_payment 'pending' para que el webhook lo reconcilie.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const APP_URL = Deno.env.get('APP_URL') || 'https://consorcio-trust.vercel.app';

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'No autorizado' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return json({ error: 'Token invalido' }, 401);

    const { expenseId, amount, consortiumId, title } = await req.json();
    if (!consortiumId || !amount) return json({ error: 'Faltan datos: consortiumId y amount' }, 400);

    const { data: mp } = await supabase.from('mp_config')
      .select('access_token, enabled').eq('consortium_id', consortiumId).eq('enabled', true).maybeSingle();
    if (!mp?.access_token) return json({ error: 'El consorcio no tiene MercadoPago configurado o esta deshabilitado.' }, 400);

    const externalRef = `consorcio_${consortiumId}_${expenseId ?? 'na'}_${user.id}_${Date.now()}`;
    const prefBody = {
      items: [{ title: String(title || 'Expensas del consorcio').slice(0, 250), quantity: 1, unit_price: Number(amount), currency_id: 'ARS' }],
      payer: { email: user.email },
      external_reference: externalRef,
      notification_url: `${supabaseUrl}/functions/v1/mp-webhook`,
      back_urls: { success: `${APP_URL}/expensas`, failure: `${APP_URL}/expensas`, pending: `${APP_URL}/expensas` },
      auto_return: 'approved',
    };
    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST', headers: { Authorization: `Bearer ${mp.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(prefBody),
    });
    const pref = await mpRes.json();
    if (!mpRes.ok) return json({ error: 'Error creando la preferencia en MercadoPago', detail: pref }, 502);

    if (expenseId) {
      await supabase.from('expense_payments').insert({
        expense_id: expenseId, user_id: user.id, amount: Number(amount), status: 'pending',
        payment_method: 'mercadopago', mp_preference_id: pref.id, mp_external_reference: externalRef, mp_status: 'pending',
      });
    }
    return json({ preferenceId: pref.id, init_point: pref.init_point, sandbox_init_point: pref.sandbox_init_point });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
