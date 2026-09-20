// Edge Function: debt-reminders
// Invocable via cron externo o manualmente. Envia recordatorios de deuda a
// los residentes con expensas pendientes (modelo por unidad: expense_period_items).
// Si hay WhatsApp configurado (WHATSAPP_TOKEN/WHATSAPP_PHONE_ID) envia por WhatsApp;
// siempre registra en debt_reminders_log. Cron sugerido: "0 12 * * *" (9 AM ART).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const money = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

// Interés simple por mora prorrateado por día (misma fórmula que src/lib/mora.js).
function lateInterest(amount: number, dueDate: string | null, monthlyPct: number, graceDays: number, asOf = new Date()): number {
  if (!dueDate || !monthlyPct || monthlyPct <= 0) return 0;
  const due = new Date(dueDate + 'T00:00:00');
  const start = new Date(due); start.setDate(start.getDate() + (graceDays || 0));
  const days = Math.floor((asOf.getTime() - start.getTime()) / 86400000);
  if (days <= 0) return 0;
  return Math.round(amount * (monthlyPct / 100) * (days / 30) * 100) / 100;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // ---- Control de acceso ----
    // (a) cron/servidor: Authorization: Bearer <SERVICE_ROLE_KEY>  -> procesa todos los consorcios
    // (b) admin logueado: JWT de usuario admin -> procesa SOLO su consorcio
    const authHeader = req.headers.get('Authorization') || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    let onlyConsortium: string | null = null;
    if (!bearer) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (bearer !== serviceKey) {
      const { data: { user }, error: uErr } = await supabase.auth.getUser(bearer);
      if (uErr || !user) return new Response(JSON.stringify({ error: 'Token invalido' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { data: prof } = await supabase.from('profiles').select('role, consortium_id').eq('id', user.id).maybeSingle();
      const isAdmin = prof && (prof.role === 'admin' || prof.role === 'super_admin');
      if (!isAdmin || !prof?.consortium_id) {
        return new Response(JSON.stringify({ error: 'Solo un administrador puede disparar recordatorios' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      onlyConsortium = prof.role === 'super_admin' ? null : prof.consortium_id;
    }

    const today = new Date();
    let cq = supabase
      .from('consortia')
      .select('id, name, reminder_enabled, reminder_days_before_due, reminder_days_after_due, late_interest_monthly_pct, late_interest_grace_days')
      .eq('reminder_enabled', true);
    if (onlyConsortium) cq = cq.eq('id', onlyConsortium);
    const { data: consortia, error: cErr } = await cq;
    if (cErr) throw cErr;
    if (!consortia?.length) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalSent = 0;

    for (const c of consortia) {
      const daysBefore = c.reminder_days_before_due ?? 3;
      const daysAfter = c.reminder_days_after_due ?? 2;
      const before = new Date(today); before.setDate(before.getDate() + daysBefore);
      const after = new Date(today); after.setDate(after.getDate() - daysAfter);

      // Periodos con vencimiento dentro de la ventana de recordatorio
      const { data: periods } = await supabase
        .from('expense_periods')
        .select('id, period, due_date')
        .eq('consortium_id', c.id)
        .gte('due_date', after.toISOString().slice(0, 10))
        .lte('due_date', before.toISOString().slice(0, 10));
      if (!periods?.length) continue;
      const periodById = new Map(periods.map((p: any) => [p.id, p]));

      // Items por unidad no pagados de esos periodos
      const { data: items } = await supabase
        .from('expense_period_items')
        .select('user_id, unit_id, amount, status, period_id')
        .in('period_id', periods.map((p: any) => p.id))
        .neq('status', 'paid');
      if (!items?.length) continue;

      const userIds = [...new Set(items.map((i: any) => i.user_id).filter(Boolean))];
      const { data: profs } = await supabase
        .from('profiles').select('id, full_name, phone, email').in('id', userIds);
      const profById = new Map((profs ?? []).map((p: any) => [p.id, p]));

      // Agrupar por usuario
      const byUser = new Map<string, { user_id: string; unit_id: string; total: number; due: string | null }>();
      for (const it of items) {
        if (!it.user_id) continue;
        const cur = byUser.get(it.user_id) ?? {
          user_id: it.user_id, unit_id: it.unit_id, total: 0, due: periodById.get(it.period_id)?.due_date ?? null,
        };
        const due = periodById.get(it.period_id)?.due_date ?? null;
        cur.total += Number(it.amount || 0) + lateInterest(Number(it.amount || 0), due, Number(c.late_interest_monthly_pct ?? 0), Number(c.late_interest_grace_days ?? 0), today);
        byUser.set(it.user_id, cur);
      }

      // Evitar duplicar el recordatorio del mismo día (cron + disparo manual)
      const { data: sentToday } = await supabase.from('debt_reminders_log')
        .select('user_id').eq('consortium_id', c.id).gte('sent_at', today.toISOString().slice(0, 10));
      const alreadySent = new Set((sentToday ?? []).map((r: any) => r.user_id));

      for (const [, user] of byUser) {
        if (alreadySent.has(user.user_id)) continue;
        const prof: any = profById.get(user.user_id);
        const dueDate = user.due ? new Date(user.due).toLocaleDateString('es-AR') : 'proximamente';
        const message = `Recordatorio ${c.name}: tu expensa de ${money(user.total)} vence el ${dueDate}. Por favor regulariza tu situacion.`;

        let channel = 'in_app';
        const waToken = Deno.env.get('WHATSAPP_TOKEN') || Deno.env.get('WHATSAPP_ACCESS_TOKEN');
        const waPhoneId = Deno.env.get('WHATSAPP_PHONE_ID') || Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
        if (prof?.phone && waToken && waPhoneId) {
          const digits = String(prof.phone).replace(/\D/g, '');
          const waPhone = digits.startsWith('54') ? digits : `54${digits}`;
          try {
            await fetch(`https://graph.facebook.com/v17.0/${waPhoneId}/messages`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${waToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ messaging_product: 'whatsapp', to: waPhone, type: 'text', text: { body: message } }),
            });
            channel = 'whatsapp';
          } catch (_) { /* si falla WhatsApp queda registrado in_app */ }
        }

        await supabase.from('debt_reminders_log').insert({
          consortium_id: c.id, user_id: user.user_id, unit_id: user.unit_id,
          channel, amount: user.total, message, sent_at: new Date().toISOString(),
        });
        totalSent++;
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: totalSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
