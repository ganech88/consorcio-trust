# Configuración de WhatsApp Business API

Guía para activar la integración de WhatsApp en ConsorcioTrust.

---

## 1. Requisitos previos

- Cuenta de **Meta Business Suite** verificada: [business.facebook.com](https://business.facebook.com)
- Número de teléfono dedicado para WhatsApp Business (no puede estar en uso en WhatsApp personal)
- App de Facebook en modo **Live** (o Desarrollo para pruebas)

---

## 2. Crear la App en Meta Developers

1. Ingresá a [developers.facebook.com](https://developers.facebook.com)
2. Creá una nueva app → tipo **Business**
3. En el panel de la app, agregá el producto **WhatsApp**
4. En **WhatsApp > Configuración de API**:
   - Anotá el **Phone Number ID** (WHATSAPP_PHONE_NUMBER_ID)
   - Generá un **Token de acceso temporal** o configurá uno permanente (WHATSAPP_TOKEN)

---

## 3. Variables de entorno en Supabase

En el [Dashboard de Supabase](https://supabase.com/dashboard) → tu proyecto → **Settings > Edge Functions**:

```
WHATSAPP_TOKEN            = EAAxxxxxxx     ← Token de acceso de Meta
WHATSAPP_PHONE_NUMBER_ID  = 12345678901234 ← ID del número de teléfono
WHATSAPP_VERIFY_TOKEN     = mi-token-secreto  ← Cualquier string que elijas (para verificación webhook)
```

> `WHATSAPP_VERIFY_TOKEN` es un string que vos definís. Meta lo enviará al verificar el webhook
> y tu Edge Function lo compara para confirmar la autenticidad.

---

## 4. Deployar las Edge Functions

Con la [CLI de Supabase](https://supabase.com/docs/guides/cli):

```bash
supabase functions deploy whatsapp-bot --project-ref TU_PROJECT_REF
supabase functions deploy send-whatsapp-notification --project-ref TU_PROJECT_REF
supabase functions deploy payment-webhook --project-ref TU_PROJECT_REF
```

---

## 5. Configurar el Webhook en Meta

1. En tu app de Meta → **WhatsApp > Configuración**
2. En la sección **Webhooks**, hacé click en **Editar**
3. **URL de devolución de llamada**:
   ```
   https://TU_PROJECT_REF.supabase.co/functions/v1/whatsapp-bot
   ```
4. **Token de verificación**: el mismo valor que pusiste en `WHATSAPP_VERIFY_TOKEN`
5. Hacé click en **Verificar y guardar**
6. Suscribite al campo **`messages`**

---

## 6. Correr la migración

```bash
supabase db push --project-ref TU_PROJECT_REF
```

O pegá el contenido de `supabase/migrations/022_whatsapp_notifications.sql` en el SQL Editor del Dashboard de Supabase.

---

## 7. Agregar número de prueba

En tu app de Meta → **WhatsApp > Configuración de API**:
- Agregá tu número personal en "Para" (destinatario de prueba)
- Enviá un mensaje de prueba

---

## 8. Comandos del Bot

Los vecinos pueden enviar estos mensajes al número de WhatsApp del consorcio:

| Comando     | Respuesta                                      |
|-------------|------------------------------------------------|
| `ayuda`     | Menú de comandos disponibles                   |
| `estado`    | Nombre, unidad y estado de vinculación         |
| `expensas`  | Listado de expensas pendientes o vencidas      |
| `reclamos`  | Reclamos activos del vecino                    |

> El bot responde solo si el número del vecino está registrado en el campo `phone` de su perfil en la app.

---

## 9. Notificaciones automáticas

El sistema envía automáticamente una notificación de WhatsApp cuando:

- **Pago aprobado** (vía MercadoPago): `payment-webhook` notifica al vecino que su pago fue procesado

Para agregar más triggers, usar la función `send-whatsapp-notification` desde cualquier Edge Function:

```typescript
await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp-notification`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: '5491112345678',  // sin +
    message: 'Tu mensaje aquí',
    consortium_id: 'uuid-del-consorcio',
    user_id: 'uuid-del-usuario',
  }),
})
```

---

## 10. Pasar a producción

1. En tu app de Meta, solicitá acceso a producción (requiere revisión de Meta)
2. Verificá el número de teléfono del negocio
3. Asegurate de tener una Política de Privacidad publicada
4. Reemplazá el token temporal por uno permanente (System User Token)

---

## Flujo de notificaciones

```
Pago aprobado en MercadoPago
  ↓
payment-webhook (Edge Function)
  → actualiza expense_payments + expenses en DB
  → llama a WhatsApp Business API directamente
  → registra en whatsapp_notifications
  ↓
Vecino recibe mensaje en WhatsApp ✅

Admin envía mensaje manual
  ↓
AdminView → tab WhatsApp → formulario
  → send-whatsapp-notification (Edge Function)
  → llama a WhatsApp Business API
  → registra en whatsapp_notifications
  ↓
Vecino recibe mensaje en WhatsApp ✅
```
