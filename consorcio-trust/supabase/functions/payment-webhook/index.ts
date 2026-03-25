import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!

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
    }

    return new Response('ok')

  } catch (error) {
    console.error('payment-webhook error:', error)
    return new Response('error', { status: 500 })
  }
})
