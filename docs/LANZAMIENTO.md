# Checklist de lanzamiento — ConsorcioTrust

Estado al 20/09/2026. Marca lo pendiente antes de abrir a consorcios reales.

## ✅ Hecho en esta etapa

### Noviembre 2026 — revisión general (frontend + config, sin cambios de DB)
- **Bandeja de pagos del admin**: ya no lista (ni cuenta en el Inicio) los checkouts de MercadoPago abandonados. Antes cada clic en "Pagar online" dejaba un `payments` `pending` que el admin podía aprobar a mano y saldar un cargo sin cobro. Filtro compartido `NOT_UNPAID_MP_CHECKOUT` en `payments.service.js`; también se aplica a "Mis pagos informados" del residente.
- **Headers de seguridad en Vercel** (`vercel.json`): `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS, y caché `immutable` para `/assets/*`. Falta CSP (ver pendientes).
- **PWA / privacidad**: el service worker ya no cachea Storage (comprobantes y documentos privados) y la caché de la API se borra al cerrar sesión (`lib/sw-cache.ts`), para dispositivos compartidos.
- **Rendición anual**: `xlsx` se carga recién al exportar (antes se importaba estático en el panel admin) y las celdas de texto pasan por `sanitizeCellValue` (anti formula-injection).
- Ícono de las notificaciones push (`/favicon.ico` no existía → `/icon-192.svg`), `AuthContext` con `value` memoizado, tests nuevos (`sw-cache`, `export-utils`).
- **MercadoPago — checkouts abandonados y devoluciones** (migración 079 + `mp-webhook` + `mercadopago-create-preference`; migración aplicada y ambas funciones desplegadas (v3) el 10/11/2026; `pg_cron` no está habilitado, así que por ahora el vencimiento corre solo al iniciar un pago online):
  - `expire_stale_mp_checkouts()` pasa a `rejected` (`mp_status = 'expired'`) los checkouts MP sin pagar de más de 48 h. Corre por `pg_cron` si la extensión está habilitada y, además, cada vez que alguien inicia un pago online. Un pago que MP acredite tarde igual se aprueba (el webhook lo encuentra por `external_reference`).
  - Iniciar un nuevo checkout reemplaza los intentos previos sin pagar del mismo usuario e item (`mp_status = 'superseded'`).
  - `mp-webhook`: reembolso o contracargo posterior a la aprobación anula el pago y **reabre el cargo**; un reintento ya no des-aprueba un pago aprobado; devolución parcial y posible pago duplicado dejan una nota para el admin. La decisión vive en `mp-webhook/decide.ts` (pura, con tests en `src/lib/__tests__/mp-webhook-decide.test.js`).
  - Rechazar/vencer un checkout MP ya no reabre un item que tenía un pago informado; rechazar un pago informado no reabre el item si queda otro pendiente. Aprobar un item desde Liquidación ya no aprueba checkouts MP sin pagar (evitaba un crédito doble en la cuenta corriente).

**Pendientes detectados en la revisión:**
- `npm audit`: 12 vulnerabilidades en prod (vite ≤6.4.3, react-router, ws, etc.) con fix sin breaking; correr `npm audit fix` y commitear el lock. `xlsx` no tiene fix en npm (solo se usa para escribir, riesgo bajo): migrar a `exceljs` o al tarball oficial de SheetJS.
- Content-Security-Policy (requiere sacar el script inline de `index.html` o usar hash).
- CORS `*` en las edge functions: restringir a `APP_URL`.
- Campanita de notificaciones: el punto rojo queda prendido siempre que haya reclamos o pagos (no hay estado "leído").

### Septiembre 2026 — cierre de pendientes de seguridad + cobranza + Ley 941
- **Webhooks fail-closed**: `mp-webhook` y `whatsapp-webhook` responden 503 si falta el secret (antes aceptaban sin firma). `mp-webhook` valida ventana de tiempo, compara `transaction_amount` con lo registrado y es idempotente (`payments.mp_payment_id` UNIQUE).
- **MercadoPago conectado**: botón "Pagar online" en Mis Expensas cuando `mp_config.enabled`. `mercadopago-create-preference` recibe solo `periodItemId`; el monto (item + mora) se deriva en el servidor y se valida pertenencia a la unidad.
- **`debt-reminders` con control de rol**: service role (cron) o admin logueado (solo su consorcio). No duplica recordatorios el mismo día. Incluye la mora en el monto.
- **Conciliación de pagos** (migración 077): `payments` vinculado a `expense_period_items` / `fines`. Aprobar un pago salda el cargo (trigger); rechazar lo reabre. El residente no puede insertar pagos ajenos ni con campos MP (trigger). Cuenta corriente muestra pagos acreditados.
- **Interés por mora**: `consortia.late_interest_monthly_pct` + `late_interest_grace_days` (Consorcio → Medios de pago). Fórmula única en `lib/mora.ts`, edge functions y `public.late_interest()`. Se ve en Mis Expensas, cuenta corriente, certificados y recordatorios.
- **Ley 941**: matrícula RPA, CUIT admin/consorcio, email (Consorcio → Marca). PDF "Liquidación (Ley 941)" por período en Liquidación: egresos con proveedor y comprobante, totales por rubro, prorrateo por coeficiente, medios de pago, leyenda legal, firma y QR a la documentación digital.
- **Multas**: el residente informa el pago de su multa desde Mis Expensas (queda vinculado a la multa).
- **Tests**: `lib/liquidacion.ts` (prorrateo extraído de LiquidacionTab) y `lib/mora.ts` con vitest.
- **Docs y landing**: README y CLAUDE.md del producto (el anterior era del plugin ECC), `public/landing.html` con posicionamiento y precios (link desde el login).


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
   - Setear el secreto `MP_WEBHOOK_SECRET` en Supabase (Edge Functions → Secrets) con el de Webhooks de MP. **Sin este secret el webhook responde 503 (fail-closed) y ningún pago se acredita.**
   - Setear `APP_URL` (ej. `https://consorcio-trust.vercel.app`) para las back_urls del checkout.
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
- **Decidido (09/2026)**: el modelo canónico es `expense_periods` → `expense_period_items` (cargo por unidad) + `payments` (pago conciliable). `expenses` + `expense_payments` quedan legacy (solo lectura en "Gastos del consorcio (informativo)"); retirarlas en una migración futura.

### TypeScript (fundación lista, migración gradual)
- `tsconfig` (allowJs), `database.types.ts` generado, cliente Supabase tipado, `lib/utils`, `lib/pagination` y `claims.service` en `.ts`. `npm run typecheck` (tsc) en CI.
- **Pendiente**: ir migrando el resto de `src/services/` y los componentes a `.ts/.tsx` de a poco (cada archivo nuevo, en TS).

## ⚠️ Advisors de Supabase que quedan (aceptables / por diseño)

- `mp_config` sin policy y vista `mp_config_safe` SECURITY DEFINER: **intencional** — el `access_token` solo se accede server-side; los clientes leen la vista sin el token.
- Funciones SECURITY DEFINER ejecutables por `authenticated`: necesarias para las policies RLS (`is_super_admin`, `current_consortium_id`, `is_consortium_admin`).


## 🏆 Funciones competitivas (junio 2026)

Cierre de gaps vs. competidores (Consorcio Abierto, Octopus, etc.). Migraciones 047-050 (aplicadas a la DB).

- **Expensas por coeficiente**: cada unidad tiene su `coefficient` (% de copropiedad). La liquidacion reparte el total segun el coeficiente (no monto plano). Pestana **Unidades** para cargar/editar coeficientes con validacion de suma = 100%.
- **Pago por coeficiente**: el residente ve su parte e informa el pago; el admin lo aprueba/rechaza desde Liquidacion.
- **Polizas de seguro** con vencimientos y alertas.
- **Presupuestos** con aprobacion/rechazo (consejo/admin).
- **Cobranzas no identificadas**: registrar pago anonimo y asociarlo a una unidad.
- **Cuenta corriente por unidad** (cargos, pagos, saldo).
- **Rendicion anual** de egresos (por mes y categoria) con export a Excel.
- **Certificado de deuda / intimacion** en PDF con logo y firma (white-label).
- **White-label**: nombre, logo, telefono, direccion y firma de la administracion (Consorcio -> Marca).
- **Comunicados segmentados** (todos / propietarios / inquilinos / morosos) + acuse de lectura.
- **Recordatorios de vencimiento**: banner in-app + edge function `debt-reminders`.

### Agendar recordatorios automaticos (debt-reminders)
- La function `debt-reminders` esta desplegada (verify_jwt ON, usa expense_period_items).
- Para que corra sola: agendar un cron (Supabase Scheduled Functions o un cron externo) que haga POST a `https://<PROJECT>.supabase.co/functions/v1/debt-reminders` con header `Authorization: Bearer <SERVICE_ROLE_KEY>`, 1 vez por dia.
- WhatsApp: setear secrets `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_ID` (o `WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID`). Sin eso, el recordatorio queda `in_app` en `debt_reminders_log` y se ve en el banner de la app.
- Email automatico de expensas/recordatorios: requiere SMTP en Supabase Auth (pendiente).


## 🧭 Próximos pasos (roadmap corto)

1. Deploy de las 4 edge functions modificadas + migración 077 + secrets (`MP_WEBHOOK_SECRET`, `APP_URL`) + cron de `debt-reminders`.
2. Probar el circuito MP completo con credenciales de prueba (pagar $1 ≠ aprobado; monto exacto → item `paid`).
3. Onboarding self-service desde la landing (crear consorcio + importar unidades desde Excel) y plan gratis hasta 20 UF con límite en DB.
4. QR interoperable / CBU-alias por unidad para conciliar transferencias por referencia.
5. Asambleas: quórum y voto por coeficiente + libro de actas. Auditoría IA de facturas (Haiku). Sueldos FATERYH (plan Administración).
