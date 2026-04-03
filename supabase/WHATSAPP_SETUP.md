# Guía de Configuración - WhatsApp Bot para ConsorcioTrust

## Costos (Argentina, 2026)

| Tipo | Costo | Cuándo aplica |
|------|-------|---------------|
| **Respuestas a vecinos** | GRATIS | Cuando el vecino escribe primero (24hs de ventana) |
| **Notificaciones proactivas** | USD $0.034 | Avisos de vencimiento, confirmaciones enviadas por vos |
| **Marketing** | USD $0.062 | No aplica para este uso |

**Ejemplo:** 50 unidades, 50 pagos + 50 avisos/mes = **~USD $1.70/mes**

---

## Paso 1: Crear cuenta de Meta Business

1. Ir a [business.facebook.com](https://business.facebook.com)
2. Crear una cuenta de empresa (o usar una existente)
3. Verificar el negocio (puede tomar 1-3 días)

## Paso 2: Configurar WhatsApp Business API

1. Ir a [developers.facebook.com](https://developers.facebook.com)
2. Crear una nueva App → Tipo: "Business" → Seleccionar "WhatsApp"
3. En el panel de WhatsApp, anotar:
   - **Phone Number ID** (ej: `123456789012345`)
   - **WhatsApp Business Account ID**
4. Generar un **Permanent Access Token**:
   - System Users → Crear system user → Generar token
   - Permisos: `whatsapp_business_messaging`, `whatsapp_business_management`

## Paso 3: Desplegar la Edge Function

### 3.1 Instalar Supabase CLI (si no está instalado)
```bash
npm install -g supabase
```

### 3.2 Login y link al proyecto
```bash
supabase login
supabase link --project-ref kldgbgxycmvywvvftuvi
```

### 3.3 Configurar variables de entorno (secrets)
```bash
supabase secrets set WHATSAPP_VERIFY_TOKEN=tu_token_secreto_personalizado
supabase secrets set WHATSAPP_ACCESS_TOKEN=EAAxxxxxxx_tu_access_token_de_meta
supabase secrets set WHATSAPP_PHONE_NUMBER_ID=123456789012345
```

> **WHATSAPP_VERIFY_TOKEN**: Inventá un string cualquiera (ej: `consorciotrust_2026_webhook`).
> Lo vas a necesitar al configurar el webhook en Meta.

### 3.4 Desplegar la función
```bash
supabase functions deploy whatsapp-webhook --no-verify-jwt
```

La URL del webhook será:
```
https://kldgbgxycmvywvvftuvi.supabase.co/functions/v1/whatsapp-webhook
```

## Paso 4: Configurar el Webhook en Meta

1. Ir a [developers.facebook.com](https://developers.facebook.com) → Tu App → WhatsApp → Configuration
2. En **Webhook**:
   - **Callback URL**: `https://kldgbgxycmvywvvftuvi.supabase.co/functions/v1/whatsapp-webhook`
   - **Verify Token**: El mismo que pusiste en `WHATSAPP_VERIFY_TOKEN`
3. Click en **Verify and Save**
4. En **Webhook fields**, suscribirse a: `messages`

## Paso 5: Ejecutar la migración SQL

Ir al [SQL Editor de Supabase](https://supabase.com/dashboard/project/kldgbgxycmvywvvftuvi/sql) y ejecutar el contenido del archivo:

```
supabase/migrations/001_add_phone_to_profiles.sql
```

## Paso 6: Registrar vecinos

Para que el bot reconozca a un vecino, su número debe estar en la tabla `profiles`:

```sql
-- Ejemplo: registrar el WhatsApp de un vecino
UPDATE profiles
SET phone = '5491112345678'  -- Sin el +, formato internacional
WHERE id = 'uuid-del-usuario';
```

El formato del teléfono debe ser el **internacional sin el +**:
- Argentina: `5491112345678` (54 = país, 9 = celular, 11 = área, número)

---

## Cómo funciona el bot

### Flujo del vecino:

| El vecino envía... | El bot responde... |
|---|---|
| 📸 **Foto del comprobante** | Registra el pago y confirma |
| 📄 **PDF** | Igual que la foto |
| `"deuda"` o `"saldo"` | Muestra el monto pendiente |
| `"reclamo: Luz PB quemada"` | Crea un reclamo y confirma |
| `"ayuda"` | Muestra el menú de opciones |
| Cualquier otra cosa | Sugiere escribir "ayuda" |

### Ejemplo de conversación:

```
Vecino: [envía foto del comprobante]
Bot: Recibimos tu comprobante, estamos procesándolo... ⏳
Bot: ✅ Pago registrado correctamente
     Tu comprobante fue recibido y está pendiente de aprobación.

Vecino: deuda
Bot: 💰 Estado de Expensas
     Período: Febrero 2026
     Monto: $95,200
     Estado: ⏳ Pendiente

Vecino: reclamo: Se filtran caños del 3er piso
Bot: ✅ Reclamo creado
     "Se filtran caños del 3er piso"
     La administración fue notificada.
```

---

## Número de prueba (Sandbox)

Meta ofrece un número de prueba gratuito para desarrollo:
1. En el panel de WhatsApp → Getting Started
2. Hay un número de prueba asignado
3. Podés agregar hasta 5 números para testear
4. Para producción, necesitás un número propio verificado

---

## Solución de problemas

| Problema | Solución |
|---|---|
| "No encontramos tu número" | Verificar que el número esté en `profiles.phone` sin el `+` |
| No llegan mensajes al webhook | Verificar suscripción a `messages` en Meta Dashboard |
| Error 403 al verificar | Verificar que `WHATSAPP_VERIFY_TOKEN` coincide |
| Error al subir comprobante | Verificar que el bucket `comprobantes` existe y tiene políticas correctas |
