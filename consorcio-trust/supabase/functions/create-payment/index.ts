import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!
const APP_URL = Deno.env.get('APP_URL') || 'https://consorcio-trust.vercel.app'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { expenseId, userId, amount } = await req.json()

    if (!expenseId || !userId) {
      return new Response(
        JSON.stringify({ error: 'expenseId y userId son requeridos' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      )
    }

    // Verificar que el expense existe y pertenece a un consorcio
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('*, consortia(name)')
      .eq('id', expenseId)
      .single()

    if (expenseError || !expense) {
      return new Response(
        JSON.stringify({ error: 'Expensa no encontrada' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      )
    }

    const unitPrice = amount || expense.amount

    // Crear preference en MercadoPago
    const preference = {
      items: [{
        title: `${expense.title} - ${expense.consortia?.name || 'Consorcio'}`,
        description: `Período: ${expense.period}`,
        quantity: 1,
        unit_price: Number(unitPrice),
        currency_id: 'ARS',
      }],
      back_urls: {
        success: `${APP_URL}?payment=success&expense=${expenseId}`,
        failure: `${APP_URL}?payment=failure&expense=${expenseId}`,
        pending: `${APP_URL}?payment=pending&expense=${expenseId}`,
      },
      auto_return: 'approved',
      external_reference: `${expenseId}:${userId}`,
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook`,
      metadata: { expense_id: expenseId, user_id: userId },
    }

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preference),
    })

    const mpData = await mpRes.json()

    if (!mpRes.ok) {
      throw new Error(mpData.message || 'Error al crear preference en MercadoPago')
    }

    // Registrar el intento de pago en la DB
    await supabase.from('expense_payments').insert({
      expense_id: expenseId,
      user_id: userId,
      amount: Number(unitPrice),
      status: 'pending',
      notes: `MP preference_id: ${mpData.id}`,
    })

    return new Response(
      JSON.stringify({ init_point: mpData.init_point, preference_id: mpData.id }),
      { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    )

  } catch (error) {
    console.error('create-payment error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    )
  }
})
