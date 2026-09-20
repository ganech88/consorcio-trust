# ConsorcioTrust

Gestión de consorcios (propiedad horizontal) para Argentina, pensada primero para el vecino y después para quien administra. Posicionamiento: **transparencia** — cada peso con su comprobante, cada unidad con su cuenta corriente.

- App: https://consorcio-trust.vercel.app · Landing: `/landing.html`
- Stack: React 19 + Vite + Tailwind (PWA) · Supabase (Postgres + RLS + Storage + Edge Functions) · Vercel · Sentry
- Segmento: consorcios chicos y autoadministrados (gratis hasta 20 UF) y administradores con cartera (fijo por consorcio, no por UF).

## Qué hace

| Módulo | Resumen |
|---|---|
| Liquidación | Total del mes → prorrateo por **coeficiente** (`lib/liquidacion.ts`, cierre exacto de centavos) → cada unidad ve su parte. PDF con contenido **Ley 941** (matrícula RPA, CUIT, egresos con comprobante, prorrateo, cuenta bancaria, QR). |
| Cobranza | Informe de pago con comprobante · **MercadoPago** (monto derivado en el servidor, webhook con firma y validación de importe) · **interés por mora** configurable por consorcio (`lib/mora.ts`) · recordatorios in-app / WhatsApp (`debt-reminders`). |
| Conciliación | Un solo registro de pagos (`payments`) vinculado al cargo que salda (`period_item_id` / `fine_id`). Aprobar el pago salda el cargo (trigger `reconcile_payment`). |
| Cuenta corriente | Cargos, mora, pagos acreditados y saldo por unidad. Certificado de deuda e intimación en PDF (white-label). |
| Finanzas | Egresos por rubro con comprobante, órdenes de pago a proveedores (generan el egreso), rendición anual con export a Excel, presupuestos, pólizas de seguro. |
| Comunidad | Reclamos, comunicados segmentados con acuse, reservas de amenities, votaciones, tablón, calendario, paquetería, visitas, chat con la administración. |
| Multitenancy | Un usuario puede pertenecer a varios consorcios; RLS por consorcio en todas las tablas; super admin. |

## Correr local

```bash
cp .env.example .env.local   # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (opcional VITE_SENTRY_DSN)
npm install
npm run dev
npm run lint && npm run typecheck && npm run test:run && npm run build
```

## Estructura

```
src/
  components/        vistas del residente (ExpensesView, ClaimsView, ...) y admin/ (LiquidacionTab, LedgerTab, ConsorcioTab, ...)
  services/          acceso a Supabase por dominio (expenses, payments, reports, pdf, mercadopago, ...)
  lib/               lógica pura y testeable: liquidacion.ts (prorrateo), mora.ts (interés), utils, pagination, export-utils
  context/           AuthContext, DataContext
supabase/
  migrations/        000..077 — SIEMPRE una migración nueva; nunca editar una aplicada
  functions/         mercadopago-create-preference, mp-webhook, mp-config, debt-reminders, whatsapp-webhook, provision-*
docs/                LANZAMIENTO.md (checklist), AUDITORIA-*.md (hallazgos), BACKUP.md
```

## Modelo de expensas (canónico)

- `expense_periods` (liquidación mensual del consorcio) → `expense_period_items` (cargo por unidad; `unit_uuid` FK real; estados `pending → reported → paid`).
- `payments` = todo pago del residente (informado, WhatsApp o MercadoPago), vinculado a un `expense_period_items` o a un `fines`. `status: pending → approved | rejected`.
- `expenses_log` = egresos del consorcio (lo que se liquida y se rinde). `expense_items` / `expenses_summary` / `expenses` + `expense_payments` son legacy fuera del path activo.
- Interés por mora: `consortia.late_interest_monthly_pct` y `late_interest_grace_days`; fórmula única en `lib/mora.ts`, en las edge functions y en `public.late_interest()` (SQL).

## Seguridad

- RLS por consorcio en todas las tablas; helpers `is_consortium_admin(cid)`, `is_super_admin()`, `current_consortium_id()`.
- Triggers que impiden al residente adulterar montos (`protect_period_items`, `protect_payments_insert`).
- Buckets `comprobantes` y `documents` privados con signed URLs.
- Webhooks **fail-closed**: sin `MP_WEBHOOK_SECRET` / `WHATSAPP_APP_SECRET` responden 503. `debt-reminders` exige service role (cron) o admin logueado.
- `mp_config.access_token` solo se lee server-side (`mp_config_safe` para el cliente).

## Secrets de Edge Functions

`MP_WEBHOOK_SECRET`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `APP_URL`. Cron diario para `debt-reminders`: `POST https://<PROJECT>.supabase.co/functions/v1/debt-reminders` con `Authorization: Bearer <SERVICE_ROLE_KEY>`.

## Roadmap

Ver `docs/LANZAMIENTO.md`. Próximo: QR interoperable / CBU por unidad para conciliar transferencias, auditoría IA de facturas, asambleas con quórum por coeficiente y libro de actas, sueldos del encargado (FATERYH) para el plan Administración.
