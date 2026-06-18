# Checklist de lanzamiento — ConsorcioTrust

Estado al 17/06/2026. Marca lo pendiente antes de abrir a consorcios reales.

## ✅ Hecho en esta etapa

- **Seguridad RLS**: cerradas todas las policies `USING(true)`, fuga de `expense_items` entre consorcios, escalada de rol; policies de admin acotadas por consorcio (un admin solo opera en el suyo). 0 policies de admin global.
- **Bucket de comprobantes privado** + signed URLs (ya no es público ni listable).
- **MercadoPago**: edge functions `mercadopago-create-preference` y `mp-webhook` (con validación de firma) desplegadas; botón de pago en la app.
- **Reset de contraseña** (email) y **monitoreo de errores** (Sentry, si hay DSN).
- **CI** (lint + test + build) en GitHub Actions.
- **Routing SPA** arreglado (vercel.json), crash de Novedades, gráficos.
- **Legal**: plantillas de Privacidad y Términos.
- Datos demo completos en Roca Golf (usuarios + todos los módulos).

## ⚙️ Configuración manual pendiente (no se puede automatizar desde acá)

1. **Supabase → plan Pro** (lo dejaste fuera del alcance): el free tier se pausa por inactividad. Necesario para producción + backups.
2. **SMTP en Supabase Auth** (Authentication → Email): para que los emails de confirmación y reset de contraseña lleguen de verdad. Sin SMTP propio, el envío es muy limitado.
3. **MercadoPago**:
   - Cada consorcio carga su `access_token`/`public_key` (admin → MercadoPago).
   - Setear el secreto `MP_WEBHOOK_SECRET` en Supabase (Edge Functions → Secrets) con el de Webhooks de MP.
   - En MP, configurar la URL de notificaciones: `https://<PROJECT>.supabase.co/functions/v1/mp-webhook`.
   - Probar con credenciales/usuarios de prueba antes de producción.
4. **Sentry**: crear proyecto y setear `VITE_SENTRY_DSN` en Vercel (env var). Sin DSN, queda inactivo (no rompe).
5. **Leaked Password Protection**: activarlo en Supabase Auth (Policies) — advisor WARN.
6. **Variables en Vercel**: confirmar `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (y opcional `VITE_SENTRY_DSN`).

## 🧹 Limpieza de repo (manual, requiere borrar archivos)

- Borrar la carpeta `consorcio-trust/` (≈271 MB, scaffold viejo) y los `.claude/worktrees/*` (copias completas del proyecto). Están gitignored pero ocupan espacio local.
- Las migraciones `037`–`043` son **datos demo**. Antes de un reset de producción real, no las apliques (o moverlas a un `supabase/seed/` aparte) para no crear usuarios falsos.

## 🏗️ Refactors grandes — estado

### Modelo de expensas (canónico definido + dashboard repuntado)
- **Cargos / pagos a residentes**: `expenses` + `expense_payments` (lo usa la vista Expensas e Informar Pago). **Fuente de verdad.**
- **Egresos del consorcio por categoría**: `expenses_log` (lo usa Finanzas y ahora el Dashboard "Destino de tus Fondos").
- El Dashboard ya **no** usa el huérfano `expense_items`/`expenses_summary` (quedaron fuera del path activo).
- **Pendiente**: retirar definitivamente `expense_periods`/`expense_period_items` (LiquidacionTab, modelo paralelo) y evaluar expensas **por unidad** (hoy `expenses` es a nivel consorcio). Es un cambio de esquema con migración de datos — hacer deliberadamente.

### TypeScript (fundación lista, migración gradual)
- `tsconfig` (allowJs), `database.types.ts` generado, cliente Supabase tipado, `lib/utils`, `lib/pagination` y `claims.service` en `.ts`. `npm run typecheck` (tsc) en CI.
- **Pendiente**: ir migrando el resto de `src/services/` y los componentes a `.ts/.tsx` de a poco (cada archivo nuevo, en TS).

## ⚠️ Advisors de Supabase que quedan (aceptables / por diseño)

- `mp_config` sin policy y vista `mp_config_safe` SECURITY DEFINER: **intencional** — el `access_token` solo se accede server-side; los clientes leen la vista sin el token.
- Funciones SECURITY DEFINER ejecutables por `authenticated`: necesarias para las policies RLS (`is_super_admin`, `current_consortium_id`, `is_consortium_admin`).
