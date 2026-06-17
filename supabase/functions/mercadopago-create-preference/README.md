# MercadoPago — configuración

Para que los pagos funcionen:
1. Cada consorcio carga su `access_token` y `public_key` (admin → MercadoPago), guardados vía la edge function `mp-config` en la tabla `mp_config` (`enabled = true`).
2. Configurar el secreto del webhook en Supabase: `MP_WEBHOOK_SECRET` (el de "Webhooks" del panel de MercadoPago). Sin él, `mp-webhook` no valida firma (deja un warning).
3. (Opcional) `APP_URL` para las back_urls (default: https://consorcio-trust.vercel.app).
4. En MercadoPago, configurar la URL de notificaciones: `https://<PROJECT>.supabase.co/functions/v1/mp-webhook`.

Para PROBAR sin plata real: usar credenciales y usuarios de prueba de MercadoPago (test users + tarjetas de prueba).
