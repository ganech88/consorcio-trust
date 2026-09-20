# CLAUDE.md — ConsorcioTrust

Guía para trabajar en este repo con Claude Code. Leé también `README.md` (qué es el producto) y `docs/LANZAMIENTO.md` (estado y pendientes).

## Qué es

SaaS de gestión de consorcios para Argentina. React 19 + Vite + Tailwind (PWA), Supabase (Postgres/RLS/Storage/Edge Functions en Deno), Vercel, Sentry. Un solo desarrollador; priorizar cambios chicos, verificables y que no rompan producción.

## Comandos

```bash
npm run dev            # Vite
npm run lint           # eslint (0 errores; warnings de react-refresh son conocidos)
npm run typecheck      # tsc --noEmit (allowJs; migración gradual a TS)
npm run test:run       # vitest (jsdom)
npm run build          # vite build
```

CI (`.github/workflows/ci.yml`) corre lint + typecheck + test + build en cada push a `main`. Vercel despliega `main` automáticamente.

## Reglas del repo

1. **Migraciones**: `supabase/migrations/NNN_nombre.sql`, numeradas y consecutivas. **Nunca editar una migración ya aplicada**; crear una nueva. Toda migración se versiona en el repo y se aplica a la DB (`kldgbgxycmvywvvftuvi`) desde el archivo. Datos demo (037–043) no se aplican en un reset de producción.
2. **RLS siempre**: toda tabla nueva con `ENABLE ROW LEVEL SECURITY` y policies scopeadas por `consortium_id` (o por unidad → consorcio). Usar `is_consortium_admin(cid)` / `is_super_admin()`. Nada de `USING (true)`.
3. **Plata**: los montos se derivan en el servidor (edge function / trigger), nunca del cliente. Estados de pago con guard (`.eq('status', ...)`) para evitar dobles aprobaciones.
4. **Lógica pura en `src/lib/`** (TS) con tests en `src/lib/__tests__/`. Los componentes y servicios solo orquestan. Archivos nuevos en `.ts/.tsx`.
5. **Servicios**: un archivo por dominio en `src/services/`, re-exportados por `data.service.js`. Errores → `throw`; la UI muestra `toast.error`.
6. **Storage privado**: guardar `path`, nunca `publicUrl`; firmar con `getSignedComprobanteUrl` al mostrar.
7. **Edge functions**: fail-closed si falta un secret; validar rol server-side (`verifyAdmin` en `mp-config` es el patrón); no devolver errores crudos de terceros al cliente.
8. **Commits**: conventional commits en español (`feat(expensas): ...`, `fix(rls): ...`).

## Mapa rápido

- Residente: `ExpensesView` (mi expensa, mora, pagar online / informar pago, multas), `Dashboard`, `ClaimsView`, `AmenitiesView`, ...
- Admin: `AdminView` → `admin/LiquidacionTab` (publicar, distribuir, aprobar, PDF Ley 941), `admin/LedgerTab` (cuenta corriente, certificado/intimación), `admin/ConsorcioTab` (datos, marca, RPA/CUIT, medios de pago, mora, MercadoPago, recordatorios), `admin/InformedPaymentsCard` (bandeja de pagos).
- Lógica: `lib/liquidacion.ts` (prorrateo por coeficiente), `lib/mora.ts` (interés), `services/pdf.service.js` (PDFs).
- DB: `expense_periods` / `expense_period_items` / `payments` / `fines` / `expenses_log` / `consortia` / `units` / `profiles`. Triggers clave: `protect_period_items` (069), `reconcile_payment` + `protect_payments_insert` (077).

## Antes de dar por terminado un cambio

`npm run lint && npm run typecheck && npm run test:run && npm run build` en verde, y si tocaste DB: migración nueva en el repo + aplicada + `docs/LANZAMIENTO.md` actualizado si cambia el estado.
