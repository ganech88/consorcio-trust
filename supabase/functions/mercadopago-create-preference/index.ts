// Edge Function: mercadopago-create-preference
// El residente pide pagar SU expensa del período (expense_period_items). El monto
// NO viene del cliente: se deriva del item (+ interés por mora del consorcio) en
// el servidor. Registra un `payments` pendiente vinculado al item, que el
// webhook concilia cuando MP lo aprueba.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const APP_URL = Deno.env.get('APP_URL') || 'https://consorcio-trust.vercel.app';

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// Interés simple por mora, prorrateado por día (misma fórmula que src/lib/mora.js).
function lateInterest(amount: number, dueDate: string | null, monthlyPct: number, graceDays: number, asOf = new Date()): number {
  if (!dueDate || !monthlyPct || monthlyPct <= 0) return 0;
  const due = new Date(dueDate + 'T00:00:00');
  const start = new Date(due); start.setDate(start.getDate() + (graceDays || 0));
  const days = Math.floor((asOf.getTime() - start.getTime()) / 86400000);
  if (days <= 0) return 0;
  return Math.round(amount * (monthlyPct / 100) * (days / 30) * 100) / 100;
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

    const { periodItemId } = await req.json().catch(() => ({}));
    if (!periodItemId) return json({ error: 'Falta periodItemId' }, 400);

    // Item + período (fuente de verdad del monto y del consorcio)
    const { data: item } = await supabase.from('expense_period_items')
      .select('id, amount, status, user_id, unit_uuid, unit_id, period_id, expense_periods(consortium_id, period, due_date)')
      .eq('id', periodItemId).maybeSingle();
    if (!item) return json({ error: 'Expensa no encontrada' }, 404);
    if (item.status === 'paid') return json({ error: 'Esta expensa ya está pagada' }, 400);
    const period: any = item.expense_periods;
    const consortiumId: string | null = period?.consortium_id ?? null;
    if (!consortiumId) return json({ error: 'Período sin consorcio' }, 400);

    // Pertenencia: titular del item, u ocupante (owner/tenant) de la unidad
    let allowed = item.user_id === user.id;
    if (!allowed && item.unit_uuid) {
      const { data: unit } = await supabase.from('units').select('owner_id, tenant_id').eq('id', item.unit_uuid).maybeSingle();
      allowed = !!unit && (unit.owner_id === user.id || unit.tenant_id === user.id);
    }
    if (!allowed) return json({ error: 'No podés pagar una expensa de otra unidad' }, 403);

    const { data: cons } = await supabase.from('consortia')
      .select('name, late_interest_monthly_pct, late_interest_grace_days').eq('id', consortiumId).maybeSingle();
    const base = Number(item.amount);
    const interest = lateInterest(base, period?.due_date ?? null, Number(cons?.late_interest_monthly_pct ?? 0), Number(cons?.late_interest_grace_days ?? 0));
    const total = Math.round((base + interest) * 100) / 100;
    if (!(total > 0)) return json({ error: 'Monto inválido' }, 400);

    const { data: mp } = await supabase.from('mp_config')
      .select('access_token, enabled').eq('consortium_id', consortiumId).eq('enabled', true).maybeSingle();
    if (!mp?.access_token) return json({ error: 'El consorcio no tiene MercadoPago habilitado.' }, 400);

    // Registro local ANTES de ir a MP (así el webhook siempre encuentra la referencia)
    const externalRef = `consorcio_${consortiumId}_${item.id}_${user.id}_${Date.now()}`;
    const { data: pay, error: payErr } = await supabase.from('payments').insert({
      user_id: user.id, unit_id: item.unit_uuid, amount: total, status: 'pending',
      period_item_id: item.id, payment_method: 'mercadopago', mp_external_reference: externalRef, mp_status: 'pending',
      notes: interest > 0 ? `Incluye interés por mora ${interest}` : null,
    }).select('id').single();
    if (payErr) return json({ error: 'No se pudo registrar el pago' }, 500);

    const title = `Expensas ${cons?.name ?? ''} ${period?.period ?? ''} - Unidad ${item.unit_id ?? ''}`.trim().slice(0, 250);
    const prefBody = {
      items: [{ id: item.id, title, quantity: 1, unit_price: total, currency_id: 'ARS' }],
      payer: { email: user.email },
      external_reference: externalRef,
      notification_url: `${supabaseUrl}/functions/v1/mp-webhook`,
      back_urls: { success: `${APP_URL}/expensas?mp=success`, failure: `${APP_URL}/expensas?mp=failure`, pending: `${APP_URL}/expensas?mp=pending` },
      auto_return: 'approved',
      statement_descriptor: 'EXPENSAS',
    };
    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST', headers: { Authorization: `Bearer ${mp.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(prefBody),
    });
    const pref = await mpRes.json().catch(() => ({}));
    if (!mpRes.ok) {
      console.error('MP preference error', pref);
      await supabase.from('payments').update({ status: 'rejected', mp_status: 'error' }).eq('id', pay.id);
      return json({ error: 'MercadoPago rechazó la solicitud. Probá de nuevo más tarde.' }, 502);
    }
    await supabase.from('payments').update({ mp_preference_id: pref.id }).eq('id', pay.id);
    return json({ preferenceId: pref.id, init_point: pref.init_point, sandbox_init_point: pref.sandbox_init_point, amount: total, interest });
  } catch (e) {
    console.error('create-preference error', e);
    return json({ error: 'error interno' }, 500);
  }
});
