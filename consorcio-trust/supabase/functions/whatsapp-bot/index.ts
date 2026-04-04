import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_TOKEN')!
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!
const WHATSAPP_VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN')!

// ─── Entry point ──────────────────────────────────────────────────────────────

serve(async (req) => {
  // GET: Meta webhook verification
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const mode      = url.searchParams.get('hub.mode')
    const token     = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 })
    }
    return new Response('Forbidden', { status: 403 })
  }

  // POST: incoming message
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      await processWebhook(body)
    } catch (err) {
      console.error('whatsapp-bot error:', err)
    }
    // Always return 200 so Meta doesn't retry
    return new Response('ok', { status: 200 })
  }

  return new Response('Method not allowed', { status: 405 })
})

// ─── Webhook processing ───────────────────────────────────────────────────────

async function processWebhook(body: Record<string, unknown>): Promise<void> {
  const entry   = (body?.entry as unknown[])?.[0] as Record<string, unknown>
  const changes = (entry?.changes as unknown[])?.[0] as Record<string, unknown>
  const value   = changes?.value as Record<string, unknown>
  const messages = value?.messages as unknown[]

  if (!messages?.[0]) return // status update, not a message

  const message = messages[0] as Record<string, unknown>
  const from    = message.from as string

  if (message.type !== 'text') {
    await sendMessage(from, 'Solo proceso mensajes de texto por ahora.\n\nEscribí *ayuda* para ver los comandos disponibles.')
    return
  }

  const text = (message.text as Record<string, string>)?.body?.trim() ?? ''
  await handleCommand(from, text)
}

// ─── Command dispatch ─────────────────────────────────────────────────────────

async function handleCommand(phone: string, text: string): Promise<void> {
  const cmd = text.toLowerCase()

  if (cmd === 'ayuda' || cmd === 'help' || cmd === 'hola' || cmd === 'menu') {
    await sendMessage(phone,
      `👋 *ConsorcioTrust Bot*\n\n` +
      `Comandos disponibles:\n\n` +
      `📊 *estado* — tu situación en el consorcio\n` +
      `💰 *expensas* — expensas pendientes de tu unidad\n` +
      `📋 *reclamos* — tus reclamos activos\n` +
      `❓ *ayuda* — este menú\n\n` +
      `_Escribí el comando exacto, sin tildes ni mayúsculas._`
    )
    return
  }

  if (cmd === 'estado') {
    await handleEstado(phone)
    return
  }

  if (cmd === 'expensas') {
    await handleExpensas(phone)
    return
  }

  if (cmd === 'reclamos') {
    await handleReclamos(phone)
    return
  }

  await sendMessage(phone,
    `No entendí el comando 🤔\nEscribí *ayuda* para ver las opciones disponibles.`
  )
}

// ─── Command handlers ─────────────────────────────────────────────────────────

async function handleEstado(phone: string): Promise<void> {
  const supabase = buildClient()
  const user = await findUser(supabase, phone)

  if (!user) {
    await sendMessage(phone, notRegisteredMsg())
    return
  }

  await sendMessage(phone,
    `📊 *Tu estado en ConsorcioTrust*\n\n` +
    `👤 Nombre: ${user.full_name || 'No registrado'}\n` +
    `🏠 Unidad: ${user.unit_id || '—'}\n` +
    `🏢 Consorcio ID: ${user.consortium_id ? '✅ Vinculado' : '⚠️ Sin consorcio'}\n\n` +
    `Escribí *expensas* o *reclamos* para más detalle.`
  )
}

async function handleExpensas(phone: string): Promise<void> {
  const supabase = buildClient()
  const user = await findUser(supabase, phone)

  if (!user) {
    await sendMessage(phone, notRegisteredMsg())
    return
  }

  if (!user.consortium_id) {
    await sendMessage(phone, 'Tu usuario no está vinculado a ningún consorcio todavía.')
    return
  }

  const { data: expenses } = await supabase
    .from('expenses')
    .select('title, amount, status, period, due_date')
    .eq('consortium_id', user.consortium_id)
    .in('status', ['pending', 'overdue'])
    .order('due_date', { ascending: true })
    .limit(5)

  if (!expenses || expenses.length === 0) {
    await sendMessage(phone, '✅ No tenés expensas pendientes.')
    return
  }

  const lines = expenses.map((e: Record<string, unknown>) => {
    const status = e.status === 'overdue' ? '🔴 Vencida' : '🟡 Pendiente'
    const amount = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(e.amount))
    return `${status} *${e.title}* — ${amount}\nPer. ${e.period}${e.due_date ? ` · vence ${e.due_date}` : ''}`
  })

  await sendMessage(phone,
    `💰 *Expensas pendientes (${expenses.length})*\n\n${lines.join('\n\n')}\n\n` +
    `Para pagar, ingresá a la app ConsorcioTrust 📱`
  )
}

async function handleReclamos(phone: string): Promise<void> {
  const supabase = buildClient()
  const user = await findUser(supabase, phone)

  if (!user) {
    await sendMessage(phone, notRegisteredMsg())
    return
  }

  const { data: claims } = await supabase
    .from('claims')
    .select('title, status, created_at')
    .eq('user_id', user.id)
    .in('status', ['open', 'pending'])
    .order('created_at', { ascending: false })
    .limit(5)

  if (!claims || claims.length === 0) {
    await sendMessage(phone, '✅ No tenés reclamos activos.')
    return
  }

  const STATUS_LABEL: Record<string, string> = {
    open:    '🔵 Abierto',
    pending: '🟡 En proceso',
    closed:  '✅ Resuelto',
  }

  const lines = claims.map((c: Record<string, unknown>) =>
    `${STATUS_LABEL[c.status as string] ?? '—'} *${c.title}*`
  )

  await sendMessage(phone,
    `📋 *Tus reclamos activos (${claims.length})*\n\n${lines.join('\n')}\n\n` +
    `Revisá el estado en la app ConsorcioTrust 📱`
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

async function findUser(supabase: ReturnType<typeof buildClient>, phone: string) {
  const variants = [phone, `+${phone}`]
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, unit_id, consortium_id')
    .in('phone', variants)
    .limit(1)
    .maybeSingle()
  return data ?? null
}

function notRegisteredMsg(): string {
  return (
    '⚠️ Tu número no está registrado en ConsorcioTrust.\n\n' +
    'Pedile al administrador que vincule tu WhatsApp a tu cuenta en la app.'
  )
}

async function sendMessage(to: string, text: string): Promise<void> {
  const url = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error(`sendMessage error to ${to}:`, err)
  }
}
