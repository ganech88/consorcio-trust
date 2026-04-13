import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

// --- Configuración ---
const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "";
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
const WHATSAPP_APP_SECRET = Deno.env.get("WHATSAPP_APP_SECRET") || "";
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!WHATSAPP_APP_SECRET || !signatureHeader) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(WHATSAPP_APP_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const expected = 'sha256=' + Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return signatureHeader === expected;
}

// =====================================================
// PUNTO DE ENTRADA - Webhook de WhatsApp
// =====================================================
Deno.serve(async (req) => {
  try {
    // GET = Verificación del webhook por Meta
    if (req.method === "GET") {
      return handleVerification(req);
    }

    // POST = Mensaje entrante
    if (req.method === "POST") {
      const rawBody = await req.text();

      // Verify Meta signature if app secret is configured
      if (WHATSAPP_APP_SECRET) {
        const signature = req.headers.get("X-Hub-Signature-256");
        const valid = await verifyWebhookSignature(rawBody, signature);
        if (!valid) {
          console.error("Firma de webhook inválida");
          return new Response("Forbidden", { status: 403 });
        }
      }

      const body = JSON.parse(rawBody);
      await handleIncomingMessage(body);
      return new Response("OK", { status: 200 });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    console.error("Error en webhook:", error);
    // Siempre responder 200 para que Meta no reintente
    return new Response("OK", { status: 200 });
  }
});

// =====================================================
// VERIFICACIÓN DEL WEBHOOK (Meta lo llama al configurar)
// =====================================================
function handleVerification(req: Request): Response {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
    console.log("Webhook verificado correctamente");
    return new Response(challenge, { status: 200 });
  }

  console.error("Verificación fallida: token inválido");
  return new Response("Forbidden", { status: 403 });
}

// =====================================================
// PROCESAMIENTO DE MENSAJES ENTRANTES
// =====================================================
async function handleIncomingMessage(body: any): Promise<void> {
  const entry = body?.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;

  if (!value?.messages?.[0]) return; // No es un mensaje, puede ser un status update

  const message = value.messages[0];
  const contact = value.contacts?.[0];
  const phone = message.from; // Número del remitente (sin +)
  const contactName = contact?.profile?.name || "Vecino";

  console.log(`Mensaje de ${contactName} (${phone}): tipo=${message.type}`);

  // Buscar usuario por teléfono
  const user = await findUserByPhone(phone);

  if (!user) {
    await sendWhatsAppMessage(phone,
      `Hola ${contactName} 👋\n\n` +
      `No encontramos tu número registrado en el sistema.\n` +
      `Por favor, pedile al administrador que vincule tu WhatsApp a tu unidad.\n\n` +
      `_ConsorcioTrust_`
    );
    return;
  }

  // Procesar según tipo de mensaje
  switch (message.type) {
    case "image":
      await handleImageMessage(message, phone, user);
      break;

    case "document":
      if (message.document?.mime_type === "application/pdf") {
        await handleImageMessage(message, phone, user); // PDFs también son comprobantes
      } else {
        await sendWhatsAppMessage(phone,
          "Solo aceptamos imágenes (fotos) o archivos PDF como comprobantes de pago. 📄"
        );
      }
      break;

    case "text":
      await handleTextMessage(message.text.body, phone, user);
      break;

    default:
      await sendWhatsAppMessage(phone,
        `Hola ${contactName} 😊\n\n` +
        `Podés hacer lo siguiente:\n` +
        `📸 *Enviá una foto* del comprobante para informar un pago\n` +
        `📝 *Escribí "reclamo:"* seguido del problema para crear un reclamo\n` +
        `💰 *Escribí "deuda"* para consultar tu saldo\n` +
        `❓ *Escribí "ayuda"* para ver las opciones disponibles`
      );
  }
}

// =====================================================
// MANEJO DE IMÁGENES (Comprobantes de pago)
// =====================================================
async function handleImageMessage(message: any, phone: string, user: any): Promise<void> {
  const mediaId = message.image?.id || message.document?.id;

  if (!mediaId) {
    await sendWhatsAppMessage(phone, "No pudimos procesar la imagen. Intentá enviarla de nuevo. 🔄");
    return;
  }

  await sendWhatsAppMessage(phone, "Recibimos tu comprobante, estamos procesándolo... ⏳");

  try {
    // 1. Obtener URL del media de WhatsApp
    const mediaUrl = await getWhatsAppMediaUrl(mediaId);

    // 2. Descargar el archivo
    const mediaData = await downloadWhatsAppMedia(mediaUrl);

    // 3. Subir a Supabase Storage
    const fileName = `${Date.now()}_${phone}_comprobante`;
    const extension = message.image ? "jpg" : "pdf";
    const fullPath = `${fileName}.${extension}`;
    const contentType = message.image ? "image/jpeg" : "application/pdf";

    const { error: uploadError } = await supabase.storage
      .from("comprobantes")
      .upload(fullPath, mediaData, { contentType });

    if (uploadError) throw new Error(`Error subiendo archivo: ${uploadError.message}`);

    // 4. Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from("comprobantes")
      .getPublicUrl(fullPath);

    // 5. Registrar pago en la base de datos
    const { error: dbError } = await supabase.from("payments").insert([{
      amount: 0, // Se completa cuando el admin lo revisa
      status: "pending",
      proof_url: publicUrl,
      user_id: user.id,
      unit_id: user.unit_id,
    }]);

    if (dbError) throw new Error(`Error guardando pago: ${dbError.message}`);

    // 6. Confirmar al vecino
    await sendWhatsAppMessage(phone,
      `✅ *Pago registrado correctamente*\n\n` +
      `Tu comprobante fue recibido y está pendiente de aprobación por la administración.\n` +
      `Te avisaremos cuando sea verificado.\n\n` +
      `_Unidad: ${user.unit_name || "Tu unidad"}_`
    );

  } catch (error) {
    console.error("Error procesando comprobante:", error);
    await sendWhatsAppMessage(phone,
      "Hubo un problema al procesar tu comprobante. Por favor intentá de nuevo en unos minutos. 🙏"
    );
  }
}

// =====================================================
// MANEJO DE MENSAJES DE TEXTO
// =====================================================
async function handleTextMessage(text: string, phone: string, user: any): Promise<void> {
  const normalized = text.toLowerCase().trim();

  // --- Consulta de deuda ---
  if (normalized === "deuda" || normalized === "saldo" || normalized === "cuanto debo" || normalized === "expensas") {
    await handleDebtQuery(phone, user);
    return;
  }

  // --- Crear reclamo ---
  if (normalized.startsWith("reclamo:") || normalized.startsWith("reclamo ")) {
    const claimText = text.replace(/^reclamo[:\s]+/i, "").trim();
    if (claimText.length < 5) {
      await sendWhatsAppMessage(phone, "Por favor describí el reclamo con más detalle. Ejemplo:\n_reclamo: Luz del pasillo PB quemada_");
      return;
    }
    await handleCreateClaim(phone, user, claimText);
    return;
  }

  // --- Ayuda ---
  if (normalized === "ayuda" || normalized === "help" || normalized === "menu" || normalized === "hola") {
    await sendWhatsAppMessage(phone,
      `Hola 👋 Soy el asistente de *ConsorcioTrust*\n\n` +
      `Esto es lo que puedo hacer por vos:\n\n` +
      `📸 *Enviá una foto* del comprobante → Registro tu pago\n` +
      `💰 Escribí *"deuda"* → Te digo cuánto debés\n` +
      `📝 Escribí *"reclamo: [descripción]"* → Creo un reclamo\n` +
      `❓ Escribí *"ayuda"* → Vés este menú\n\n` +
      `_Ejemplo: "reclamo: Se filtran los caños del 3er piso"_`
    );
    return;
  }

  // --- Mensaje no reconocido ---
  await sendWhatsAppMessage(phone,
    `No entendí tu mensaje 🤔\n` +
    `Escribí *"ayuda"* para ver las opciones disponibles.`
  );
}

// =====================================================
// CONSULTAS ESPECÍFICAS
// =====================================================
async function handleDebtQuery(phone: string, user: any): Promise<void> {
  try {
    const { data: expenses } = await supabase
      .from("expenses_summary")
      .select("*")
      .eq("unit_id", user.unit_id)
      .order("period", { ascending: false })
      .limit(1);

    if (!expenses || expenses.length === 0) {
      await sendWhatsAppMessage(phone, "No encontramos expensas pendientes para tu unidad. ✅");
      return;
    }

    const exp = expenses[0];
    await sendWhatsAppMessage(phone,
      `💰 *Estado de Expensas*\n\n` +
      `Período: ${exp.period || "Actual"}\n` +
      `Monto: $${Number(exp.total_amount || 0).toLocaleString("es-AR")}\n` +
      `Estado: ${exp.status === "paid" ? "✅ Pagado" : "⏳ Pendiente"}\n\n` +
      `Para informar un pago, enviá una foto del comprobante 📸`
    );
  } catch (error) {
    console.error("Error consultando deuda:", error);
    await sendWhatsAppMessage(phone, "Hubo un error consultando tu saldo. Intentá de nuevo más tarde. 🙏");
  }
}

async function handleCreateClaim(phone: string, user: any, description: string): Promise<void> {
  try {
    const { error } = await supabase.from("claims").insert([{
      title: description,
      status: "open",
      consortium_id: user.consortium_id,
      user_id: user.id,
    }]);

    if (error) throw error;

    await sendWhatsAppMessage(phone,
      `✅ *Reclamo creado*\n\n` +
      `"${description}"\n\n` +
      `La administración fue notificada. Te avisaremos cuando haya novedades.`
    );
  } catch (error) {
    console.error("Error creando reclamo:", error);
    await sendWhatsAppMessage(phone, "Hubo un error creando el reclamo. Intentá de nuevo. 🙏");
  }
}

// =====================================================
// UTILIDADES: WhatsApp API
// =====================================================
async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  const url = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Error enviando mensaje a ${to}:`, errorBody);
  }
}

async function getWhatsAppMediaUrl(mediaId: string): Promise<string> {
  const response = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
    headers: { "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
  });

  if (!response.ok) throw new Error("No se pudo obtener URL del media");

  const data = await response.json();
  return data.url;
}

async function downloadWhatsAppMedia(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url, {
    headers: { "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
  });

  if (!response.ok) throw new Error("No se pudo descargar el media");
  return await response.arrayBuffer();
}

// =====================================================
// UTILIDADES: Base de datos
// =====================================================
async function findUserByPhone(phone: string): Promise<any | null> {
  // Buscar con y sin código de país
  const phoneVariants = [phone, `+${phone}`];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, unit_id, consortium_id, full_name, phone, units(name)")
    .in("phone", phoneVariants)
    .limit(1);

  if (error || !data || data.length === 0) return null;

  const profile = data[0];
  return {
    id: profile.id,
    unit_id: profile.unit_id,
    consortium_id: profile.consortium_id,
    name: profile.full_name,
    unit_name: (profile as any).units?.name,
  };
}
