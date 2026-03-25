# Configuración de MercadoPago

Guía para activar los pagos con MercadoPago Checkout Pro en ConsorcioTrust.

---

## 1. Obtener el Access Token

1. Ingresá a [MercadoPago Developers](https://www.mercadopago.com.ar/developers/panel/app)
2. Creá una nueva aplicación (o usá una existente)
3. En la sección **Credenciales**, copiá el **Access Token**:
   - `TEST-xxxx` → modo sandbox (para pruebas)
   - Token de producción → para pagos reales

> El Access Token **nunca** debe incluirse en el código frontend ni en el repositorio.
> Se configura únicamente como variable de entorno en Supabase.

---

## 2. Configurar variables de entorno en Supabase

En el [Dashboard de Supabase](https://supabase.com/dashboard) → tu proyecto → **Settings > Edge Functions**:

```
MERCADOPAGO_ACCESS_TOKEN = TEST-xxxx   ← tu token de MP
APP_URL = https://consorcio-trust.vercel.app  ← URL de tu app desplegada
```

---

## 3. Deployar las Edge Functions

Con la [CLI de Supabase](https://supabase.com/docs/guides/cli) instalada y logueada:

```bash
# Desde la raíz del proyecto
supabase functions deploy create-payment --project-ref TU_PROJECT_REF
supabase functions deploy payment-webhook --project-ref TU_PROJECT_REF
```

Para obtener `TU_PROJECT_REF`: Dashboard → Settings → General → Reference ID.

---

## 4. Configurar el Webhook en MercadoPago

1. En MercadoPago Developers → tu app → **Webhooks**
2. Agregá la URL del webhook:
   ```
   https://TU_PROJECT_REF.supabase.co/functions/v1/payment-webhook
   ```
3. Seleccioná el evento **`payment`**
4. Guardá y verificá que MercadoPago pueda contactar la URL

> La Edge Function `payment-webhook` actualiza el estado del pago en la DB
> automáticamente cuando MercadoPago confirma o rechaza un pago.

---

## 5. Probar en sandbox

1. Usá el token `TEST-xxxx` (sandbox)
2. Hacé click en "Pagar con MercadoPago" en una expensa pendiente
3. MP te redirige al checkout de pruebas — usá las [tarjetas de prueba de MP](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/test/cards)
4. Verificá que el webhook actualice el estado en `expense_payments`

### Tarjetas de prueba (Argentina)

| Tarjeta          | Número             | CVV  | Vencimiento |
|------------------|--------------------|------|-------------|
| Mastercard (✓)  | 5031 7557 3453 0604 | 123  | 11/25       |
| Visa (✓)        | 4509 9535 6623 3704 | 123  | 11/25       |
| Mastercard (✗)  | 5031 7557 3453 0620 | 123  | 11/25       |

---

## 6. Pasar a producción

1. Reemplazá `MERCADOPAGO_ACCESS_TOKEN` por el token de producción en Supabase
2. Actualizá `APP_URL` con la URL de producción si cambió
3. Re-deployá las funciones:
   ```bash
   supabase functions deploy create-payment --project-ref TU_PROJECT_REF
   supabase functions deploy payment-webhook --project-ref TU_PROJECT_REF
   ```
4. Actualizá el webhook en MP con la URL de producción

---

## Flujo completo

```
Vecino → click "Pagar con MercadoPago"
  ↓
Edge Function create-payment
  → crea preference en MP API
  → registra expense_payment (status: pending) en DB
  → devuelve init_point (URL de checkout)
  ↓
Vecino paga en checkout de MercadoPago
  ↓
MercadoPago → POST /functions/v1/payment-webhook
  → Edge Function payment-webhook
  → actualiza expense_payment (status: approved/rejected)
  → si approved: actualiza expenses.status = 'paid'
  ↓
MercadoPago redirige al vecino a la app
  → ?payment=success|failure|pending&expense=ID
  → App.jsx muestra toast con el resultado
  → navega a la vista de Expensas
```
