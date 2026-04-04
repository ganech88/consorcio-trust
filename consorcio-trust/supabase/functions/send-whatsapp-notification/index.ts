import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_TOKEN')!
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { phone, message, consortium_id, user_id } = await req.json() as {
      phone: string
      message: string
      consortium_id?: string
      user_id?: string
    }

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: 'phone y message son requeridos' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      )
    }

    // Normalizar teléfono: quitar + y espacios, el número debe ser E.164 sin +
    const normalizedPhone = phone.replace(/^\+/, '').replace(/\s/g, '')

    // Enviar mensaje por WhatsApp Business API
    const waRes = await fetch(
      `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: normalizedPhone,
          type: 'text',
          text: { body: message },
        }),
      }
    )

    const waData = await waRes.json() as Record<string, unknown>
    const waMessageId = (waData?.messages as Array<Record<string, string>>)?.[0]?.id ?? null
    const failed = !waRes.ok

    // Registrar en whatsapp_notifications
    await supabase.from('whatsapp_notifications').insert({
      consortium_id: consortium_id ?? null,
      user_id: user_id ?? null,
      phone: normalizedPhone,
      message,
      status: failed ? 'failed' : 'sent',
      whatsapp_message_id: waMessageId,
      error_message: failed ? JSON.stringify(waData) : null,
    })

    if (failed) {
      return new Response(
        JSON.stringify({ error: 'Error al enviar mensaje de WhatsApp', detail: waData }),
        { status: 502, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      )
    }

    return new Response(
      JSON.stringify({ ok: true, whatsapp_message_id: waMessageId }),
      { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    )

  } catch (error) {
    console.error('send-whatsapp-notification error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    )
  }
})
