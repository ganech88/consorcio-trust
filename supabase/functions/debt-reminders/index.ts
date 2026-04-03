// Edge Function: debt-reminders
// Invocable via cron or manually. Sends debt reminders to users with pending expenses.
// Cron: daily at 9 AM Argentina time (UTC-3) → schedule: "0 12 * * *"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Consortium {
  id: string;
  name: string;
  reminder_enabled: boolean;
  reminder_days_before_due: number;
  reminder_days_after_due: number;
}

interface PendingDebt {
  user_id: string;
  unit_id: string;
  total_pending: number;
  due_date: string | null;
  profiles: {
    full_name: string;
    phone: string | null;
    email: string | null;
  } | null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    // Obtener todos los consorcios con recordatorios habilitados
    const { data: consortia, error: cErr } = await supabase
      .from('consortia')
      .select('id, name, reminder_enabled, reminder_days_before_due, reminder_days_after_due')
      .eq('reminder_enabled', true);

    if (cErr) throw cErr;
    if (!consortia?.length) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalSent = 0;

    for (const consortium of (consortia as Consortium[])) {
      const daysBefore = consortium.reminder_days_before_due ?? 3;
      const daysAfter = consortium.reminder_days_after_due ?? 2;

      // Calcular rango de fechas de vencimiento relevantes
      const beforeDate = new Date(today);
      beforeDate.setDate(beforeDate.getDate() + daysBefore);

      const afterDate = new Date(today);
      afterDate.setDate(afterDate.getDate() - daysAfter);

      // Obtener expensas no pagadas con vencimiento en el rango
      const { data: debts } = await supabase
        .from('expenses')
        .select(`
          user_id,
          unit_id,
          amount,
          due_date,
          profiles (full_name, phone, email)
        `)
        .eq('consortium_id', consortium.id)
        .eq('status', 'pending')
        .gte('due_date', afterDate.toISOString().slice(0, 10))
        .lte('due_date', beforeDate.toISOString().slice(0, 10));

      if (!debts?.length) continue;

      // Agrupar por usuario
      const byUser = new Map<string, PendingDebt>();
      for (const debt of debts) {
        const key = debt.user_id;
        if (!byUser.has(key)) {
          byUser.set(key, {
            user_id: debt.user_id,
            unit_id: debt.unit_id,
            total_pending: 0,
            due_date: debt.due_date,
            profiles: debt.profiles,
          });
        }
        const entry = byUser.get(key)!;
        entry.total_pending += Number(debt.amount);
      }

      for (const [, user] of byUser) {
        const dueDate = user.due_date
          ? new Date(user.due_date).toLocaleDateString('es-AR')
          : 'próximamente';

        const amount = new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
          maximumFractionDigits: 0,
        }).format(user.total_pending);

        const message = `Recordatorio ${consortium.name}: Tu expensa de ${amount} vence el ${dueDate}. Por favor regularizá tu situación.`;

        // Enviar WhatsApp si tiene teléfono
        if (user.profiles?.phone) {
          const waToken = Deno.env.get('WHATSAPP_TOKEN');
          const waPhoneId = Deno.env.get('WHATSAPP_PHONE_ID');

          if (waToken && waPhoneId) {
            const phone = user.profiles.phone.replace(/\D/g, '');
            const waPhone = phone.startsWith('54') ? phone : `54${phone}`;

            await fetch(`https://graph.facebook.com/v17.0/${waPhoneId}/messages`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${waToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: waPhone,
                type: 'text',
                text: { body: message },
              }),
            });
          }
        }

        // Registrar en log
        await supabase.from('debt_reminders_log').insert({
          consortium_id: consortium.id,
          user_id: user.user_id,
          unit_id: user.unit_id,
          channel: user.profiles?.phone ? 'whatsapp' : 'in_app',
          amount: user.total_pending,
          message,
          sent_at: new Date().toISOString(),
        });

        totalSent++;
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: totalSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
