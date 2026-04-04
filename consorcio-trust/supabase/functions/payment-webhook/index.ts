import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!
const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_TOKEN') ?? ''
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? ''

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json()

    // Solo procesar notificaciones de tipo "payment"
    if (body.type !== 'payment') {
      return new Response('ok')
    }

    // Obtener detalles del pago desde la API de MercadoPago
    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${body.data.id}`, {
      headers: { 'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}` },
    })

    if (!paymentRes.ok) {
      console.error('Error fetching payment from MP:', paymentRes.status)
      return new Response('error fetching payment', { status: 500 })
    }

    const payment = await paymentRes.json()

    const [expenseId, userId] = (payment.external_reference || ':').split(':')

    if (!expenseId || !userId) {
      console.warn('payment-webhook: external_reference inválido:', payment.external_reference)
      return new Response('ok')
    }

    // Mapear estado de MP a estado interno
    const dbStatus =
      payment.status === 'approved' ? 'approved' :
      payment.status === 'rejected' ? 'rejected' :
      'pending'

    // Actualizar el registro de pago
    await supabase
      .from('expense_payments')
      .update({
        status: dbStatus,
        notes: `MP payment_id: ${payment.id} | status: ${payment.status}`,
      })
      .eq('expense_id', expenseId)
      .eq('user_id', userId)
      .eq('status', 'pending')

    // Si el pago fue aprobado, marcar la expensa como pagada
    if (dbStatus === 'approved') {
      await supabase
        .from('expenses')
        .update({ status: 'paid' })
        .eq('id', expenseId)

      // Enviar notificación WhatsApp al vecino
      await notifyPaymentApproved(supabase, userId, expenseId)
    }

    return new Response('ok')

  } catch (error) {
    console.error('payment-webhook error:', error)
    return new Response('error', { status: 500 })
  }
})

// ─── WhatsApp notification helper ─────────────────────────────────────────────

async function notifyPaymentApproved(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  expenseId: string,
): Promise<void> {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) return

  try {
    // Fetch user phone and expense title
    const [{ data: profile }, { data: expense }] = await Promise.all([
      supabase.from('profiles').select('phone, full_name').eq('id', userId).single(),
      supabase.from('expenses').select('title, amount').eq('id', expenseId).single(),
    ])

    if (!profile?.phone) return

    const phone = profile.phone.replace(/^\+/, '').replace(/\s/g, '')
    const amount = new Intl.NumberFormat('es-AR', {
      style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
    }).format(Number(expense?.amount ?? 0))

    const message =
      `✅ *Pago aprobado*\n\n` +
      `Hola ${profile.full_name ?? 'vecino'}! Tu pago de *${expense?.title ?? 'expensa'}* ` +
      `por *${amount}* fue procesado correctamente.\n\n` +
      `_ConsorcioTrust_`

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: message },
        }),
      }
    )

    const waData = await res.json() as Record<string, unknown>
    const waMessageId = (waData?.messages as Array<Record<string, string>>)?.[0]?.id ?? null

    // Log notification
    await supabase.from('whatsapp_notifications').insert({
      user_id: userId,
      phone,
      message,
      status: res.ok ? 'sent' : 'failed',
      whatsapp_message_id: waMessageId,
      error_message: res.ok ? null : JSON.stringify(waData),
    })
  } catch (err) {
    console.error('notifyPaymentApproved error:', err)
  }
}
