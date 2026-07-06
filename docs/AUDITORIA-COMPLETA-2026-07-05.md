# Auditoría completa — ConsorcioTrust (2026-07-05)

Alcance: código completo (frontend, servicios, migraciones, edge functions, scripts), base de datos en vivo (Supabase `kldgbgxycmvywvvftuvi`), dependencias y deploy. Solo lectura: **no se modificó nada**. Los hallazgos de código se verificaron contra la DB real; varios reportes preliminares se ajustaron con esa verificación.

Excluye lo ya corregido hoy: trigger anti-cambio de `consortium_id` (066), bucket `documents` privado (067), revoke EXECUTE anon (068), confirm email + password 8.

---

## Resumen ejecutivo

| Área | Estado |
|---|---|
| Aislamiento multi-tenant (RLS) | ✅ Sólido (verificado en vivo) |
| Secretos / XSS / Storage | ✅ Limpio (sin secretos hardcodeados, sin XSS, buckets privados) |
| Drift repo ↔ DB producción | 🔴 ALTO — las migraciones NO reconstruyen la DB real |
| Lógica de pagos/expensas | 🔴 3 ALTOS — inquilinos sin expensas, monto editable, pagos sin conciliar |
| Chat admin | 🔴 Bandeja siempre vacía (bug de join) |
| Edge functions | 🟠 Webhooks fail-open + sin validación de monto (MP hoy apagado) |
| Módulos rotos | 🔴 Paquetes (x2), subida de documentos |
| Dependencias npm | 🟠 9 vulnerabilidades en producción (7 high, casi todas con fix) |
| Performance DB | 🟡 Deuda de índices y policies (irrelevante pre-lanzamiento, barata de pagar) |

**No hay ningún CRÍTICO explotable en producción hoy.** Dos hallazgos reportados como críticos por el análisis de código resultaron mitigados al verificar la DB en vivo (ver §2). El riesgo dominante es el **drift**: la DB real ya no se puede reconstruir desde el repo, y los "críticos fantasma" del código son síntoma de eso.

---

## 1. ALTO — Drift entre migraciones y DB en producción

La DB en vivo difiere del repo en varios puntos verificados:

- Las policies permisivas `expense_items_select_all` y `documents_select` (`USING true`) existen en las migraciones pero **ya no existen en la DB** (fueron dropeadas a mano). En vivo las reemplazan policies scopeadas correctas.
- `payments` en el repo (018) tiene `CHECK status IN ('pending','verified','rejected')` y `unit_id text`; **en vivo no hay ningún CHECK** y `unit_id` es FK real a `units`. Por eso "Aprobar" con `status='approved'` funciona hoy, pero fallaría en una DB reconstruida.
- Los fixes 067/068 se aplicaron vía MCP y **no existen como archivos** en `supabase/migrations/` (la última local es 066).
- No hay `CREATE TABLE` para `profiles`, `units`, `claims`, `expenses_summary` (creadas a mano pre-migraciones).
- Secuencia: faltan 021, 022, 051; hay dos archivos `052_*`.
- `git status` muestra migraciones ya aplicadas **editadas después de aplicarse** (001, 019, 032) — nunca editar una migración aplicada; siempre crear una nueva.

**Fix:** generar un baseline con `supabase db dump` como migración 000 (o reset de la carpeta migrations contra el estado real), versionar 067/068, y de acá en más: toda migración se aplica desde archivo, nunca a mano.

## 2. Seguridad — hallazgos verificados en vivo

**2.1 ALTO — El residente puede editar el `amount` de su expensa antes de que el admin apruebe.**
La policy viva `expense_period_items_user_update` tiene `WITH CHECK (user_id = auth.uid() AND status IN ('pending','reported'))` — o sea el auto-`paid` **sí está bloqueado** (baja del CRÍTICO reportado), pero no restringe columnas: con la anon key pública, un residente puede hacer `update({amount: 1, status:'reported'})` sobre su fila y el admin aprueba un monto adulterado si no lo compara contra la liquidación.
**Fix:** reemplazar el update directo por un RPC `report_period_item_payment(item_id)` SECURITY DEFINER que solo transicione pending→reported, o trigger que congele `amount`/`unit_id`/`period_id` para no-admins.

**2.2 ALTO — Webhooks fail-open.**
- `mp-webhook/index.ts:23`: si `MP_WEBHOOK_SECRET` no está seteado, `return true` acepta cualquier POST anónimo (`verify_jwt=false`).
- `whatsapp-webhook/index.ts:42`: mismo patrón — si falta `WHATSAPP_APP_SECRET`, saltea la validación de firma.
**Fix:** fallar cerrado (500/401 si falta el secret). Riesgo real hoy bajo (MP sin uso), pero es una migración de 2 líneas por función.

**2.3 ALTO — mp-webhook no valida monto, y create-preference confía en el cliente.**
`mercadopago-create-preference` acepta `amount`/`consortiumId`/`expenseId` del body sin verificar pertenencia ni derivar el monto del servidor; `mp-webhook` marca aprobado consultando solo el `status` a MP, sin comparar `transaction_amount` contra la deuda → pagar $1 y quedar aprobado. **Debe corregirse antes de encender MP** (`mp_config.enabled`). Además: sin `UNIQUE` en `expense_payments.mp_payment_id` (idempotencia ante reintentos) y devuelve el error crudo de MP al cliente.

**2.4 ALTO — `debt-reminders` sin control de rol.** Cualquier usuario autenticado puede invocarla y disparar envíos masivos de WhatsApp (costo/spam). **Fix:** verificar admin dentro de la función (patrón `verifyAdmin` de `mp-config`, que sí lo hace bien).

**2.5 MEDIO — Defensa en profundidad:**
- `updateProfile(userId, updates)` acepta objeto libre (`profile.service.js:23`) — mitigado por triggers 034/066; conviene allow-list de columnas (`full_name`, `phone`, ...).
- El aislamiento de `payments` depende 100% de la policy 062 (JOIN por unidad); documentarla como load-bearing o desnormalizar `consortium_id`.
- Contraseñas temporales de provisioning con `Math.random()` y devueltas en el JSON (`provision-consortium-admin:43`); usar `crypto.getRandomValues` + cambio forzado.
- Backup JSON con PII subido como artifact de GitHub Actions (90 días de retención); cifrarlo.
- Excel formula injection en exportaciones (`export-utils.js`): prefijar `'` a strings que empiecen con `=`,`+`,`-`,`@`.

**2.6 Limpio (verificado):** sin secretos en repo (`.env` NO está trackeado, solo `.env.example`; los `.bat` solo hacen git add/commit/push), sin `dangerouslySetInnerHTML`, firmas HMAC sí implementadas en ambos webhooks, `mp-config` revalida admin server-side, buckets privados con signed URLs, validación MIME+10MB en subidas, reset de password sin enumeración de emails.

**2.7 Advisors Supabase (security):** sin novedades reales — los WARN restantes son los conocidos/aceptados (funciones helper anon-executable usadas por RLS, `mp_config_safe` SECURITY DEFINER por diseño, HaveIBeenPwned requiere plan Pro). Las funciones SECURITY DEFINER ejecutables por `authenticated` validan rol internamente.

## 3. Lógica de negocio — cómo funciona el consorcio y dónde se rompe

Circuito principal (caso feliz, funciona): admin liquida período → distribución por coeficiente a propietarios (redondeo con ajuste de drift ✅, doble distribución bloqueada por UNIQUE ✅) → residente ve su parte y "informa pago" con comprobante → admin aprueba → Cta. Cte. refleja. Onboarding/invitaciones con RPCs atómicos ✅. Reclamos, Novedades, Calendario, Tablón, Contactos, Perfil: funcionales.

Donde se rompe:

**3.1 ALTO — Los inquilinos nunca ven su expensa.** `LiquidacionTab.jsx:100-105` asigna `user_id: u.owner_id || null`; quien entró como inquilino (`units.tenant_id`) o unidad sin owner queda con `user_id null` → no ve nada, no puede informar pago, y su Cta. Cte. (`reports.service.js:6-14`, también por owner) queda vacía. **Fix:** `owner_id || tenant_id` + ledger por unidad.

**3.2 ALTO — Aprobar un pago informado no concilia nada.** `setInformedPaymentStatus` solo cambia `payments.status`: no se vincula a período/multa/unidad, no toca saldo, y el ledger ignora la tabla `payments`. Hay 3 registros de pago que no se hablan (`expense_period_items`, `payments`, `expense_payments` legacy). **Fix (diseño):** al aprobar, exigir asociación a item de período/multa y que el ledger lo incorpore.

**3.3 ALTO — Chat: la bandeja del admin siempre está vacía.** `fetchAllConversations` (`chat.service.js:22`) embebe `profiles(full_name, unit_id)` pero `conversations.user_id` solo tiene FK a `auth.users` (verificado en vivo) → PostgREST falla → `return []` silencioso. **Fix:** FK `conversations.user_id → profiles(id)` o resolver nombres en query aparte. Extra: `countUnreadMessages` no tiene callers → los badges de no-leídos nunca funcionan.

**3.4 ALTO — Reservas: un rechazo bloquea el turno para siempre.** La UNIQUE viva `(consortium_id, amenity_id, date, time_slot)` incluye rechazadas (la parcial 051 se dropeó en 052). Además la disponibilidad que ve el residente es ficticia (RLS solo le muestra sus propias reservas → badges "Disponible" mienten) y no hay flujo para cancelar una aprobada. **Fix:** índice único parcial `WHERE status IN ('pending','approved')` + policy SELECT de disponibilidad (fecha/turno/estado, sin datos personales).

**3.5 ALTO — Los dos módulos de paquetes están rotos.** (a) Accesos→Paquetes usa columnas que no existen (`unit_id/user_id/received_at/delivered_at` vs schema real `unit_user_id/logged_by/collected_at`) → alta con error, listados vacíos. (b) Paquetería nunca setea `unit_user_id` → el residente jamás ve sus paquetes. **Fix:** eliminar el legacy de Accesos y agregar selector de destinatario en Paquetería.

**3.6 ALTO — No existe vía en la UI para que el admin suba documentos del consorcio.** `uploadConsortiumDocument` inserta 4 columnas inexistentes, omite `user_id NOT NULL`, y usa `getPublicUrl` sobre bucket ahora privado — y además no tiene callers. DocsView es solo lectura. **Fix:** reescribir contra el schema real (`title/file_name/file_url/user_id/doc_type`) con signed URLs y exponer el botón.

**3.7 MEDIOS relevantes:**
- `expense_period_items.unit_id` guarda el **nombre** de la unidad (texto), no el UUID — renombrar una unidad rompe trazabilidad; inconsistente con `fines`/`payments` (UUID).
- Unidades con coeficiente 0 quedan silenciosamente sin facturar (solo un toast si la suma ≠ 100%).
- Aprobar/rechazar sin guard de estado (`.eq('status','reported')` faltante) en expensas y pagos → doble click / dos admins pisan estados.
- Whatsapp-webhook guarda `publicUrl` de comprobantes (bucket privado desde 046) → URLs muertas; guardar `path` y firmar en el front.
- Votaciones: se puede votar vencida por API (validar `ends_at` en policy/trigger); voto por persona, sin coeficiente ni quórum — como "encuesta" está bien, como asamblea no.
- Multas sin `user_id` son huérfanas (nadie las ve ni las debe) y el residente no tiene flujo para informar pago de multa.
- Borrar una orden de pago pagada deja el egreso auto-generado (065) → egresos duplicados si se recrea. Bloquear delete de `paid`.
- Cambiar rol owner↔resident en UsersTab no re-vincula `units.owner_id/tenant_id` → impacta liquidación. Invitación por unidad pisa al ocupante anterior sin aviso.
- Chat no re-ata la conversación si el usuario cambia de consorcio.
- Tabs admin `expenses`/`cobranzas` definidos pero inaccesibles (no están en ningún grupo de `AdminView.jsx:48-52`).
- MercadoPago: el botón de pago del residente directamente no existe (`createMpPreference` sin callers) — el gate `mp_config.enabled` se cumple trivialmente, pero encenderlo hoy no hace nada.

## 4. Dependencias (npm audit)

Producción: **9 vulnerabilidades (7 high, 2 moderate)** — `vite`, `react-router-dom`/`react-router` (incluye un deserialization RCE en SSR, no aplicable a SPA pero conviene subir), `rollup`, `ws`, `picomatch`, `postcss`, `dompurify` (vía jspdf). **Todas con fix disponible salvo `xlsx`** (SheetJS: prototype pollution + ReDoS, sin parche en npm — riesgo bajo porque solo exporta, no parsea archivos ajenos; alternativa: `exceljs` o la build oficial de SheetJS CDN).
**Fix:** `npm audit fix` (sin `--force` primero), revisar `npm run build` después.

## 5. Performance DB (advisors)

Nada urgente con el volumen actual, pero deuda concreta:
- **60 policies `auth_rls_initplan`**: re-evalúan `auth.uid()`/`current_setting()` por fila. Fix mecánico: envolver en `(select auth.uid())`.
- **110 casos de policies permisivas múltiples** por tabla/rol/acción (se evalúan todas en OR): consolidar.
- **51 FKs sin índice** — los que importan: `profiles.consortium_id`, `units.consortium_id/owner_id`, `payments.unit_id/user_id`, `messages.sender_id`, `claims.*`, `expense_items.summary_id`.
- 28 índices sin uso (esperable pre-lanzamiento; revisar post-lanzamiento).

## 6. Higiene del repo

- Carpeta anidada `consorcio-trust/` (271 MB, copia vieja con node_modules y un whatsapp-webhook viejo sin validación de firma) → borrar.
- 21 `deploy-*.bat` en la raíz (varios sin trackear) que solo hacen git add/commit/push, con `del /f /q .git\index.lock` a ciegas → reemplazar por uno solo o borrar.
- `dist/` local (no versionado ✅), archivos modificados sin commit hace tiempo (CLAUDE.md, AGENTS.md, config.toml, whatsapp-webhook editado local vs desplegado v5) → commitear o descartar; el whatsapp-webhook local difiere del desplegado.
- Sin tests de frontend (0 tests). Los flujos de plata (liquidación, aprobación de pagos) son los primeros candidatos.

## 7. Plan de acción recomendado (orden)

1. **Baseline de migraciones** (`supabase db dump` → 000) + versionar 067/068 + no editar migraciones aplicadas. Cierra el drift que generó la mitad de los falsos críticos.
2. **RPC/trigger para informar pago** (congela `amount`) — único agujero de negocio explotable hoy.
3. **Chat admin**: FK a profiles + badges de no-leídos (ya está en tu cola de lanzamiento como "bandeja admin").
4. **Liquidar a `owner_id || tenant_id`** + ledger por unidad + `unit_id` UUID en `expense_period_items` (afecta directamente cobrar expensas — es el core del producto).
5. **Conciliación de pagos**: aprobar = asociar a item/multa; unificar los 3 registros de pago.
6. **Reservas**: índice único parcial + disponibilidad real.
7. **Paquetes y Documentos**: borrar legacy roto, destinatario en Paquetería, reescribir subida de documentos.
8. **Antes de encender MP**: monto server-side en create-preference, validación de monto + fail-closed + UNIQUE mp_payment_id en webhook. Fail-closed también en whatsapp-webhook y rol en debt-reminders.
9. `npm audit fix` + limpieza de repo (carpeta anidada, .bat, código muerto: `PaymentModal`, tabs inaccesibles, `fetchUnitFines`, `createMpPreference` o conectarlo).
10. Performance DB en una sola migración: índices FK calientes + `(select auth.uid())` en policies.

---

## ADDENDUM 2026-07-06 — Remediación aplicada

Se corrigió todo el plan **excepto lo relativo a MercadoPago y WhatsApp** (a pedido: quedan para antes de encender esas integraciones) y la **conciliación completa de pagos** (pertenece al rediseño de pagos ya decidido en la cola de lanzamiento).

**DB — 10 migraciones aplicadas en vivo y versionadas en `supabase/migrations/`:**
`000` baseline de tablas nunca versionadas (profiles/units/claims/expenses_summary) · `067`/`068` retroactivas (drift cerrado) · `069` trigger anti-adulteración de expensas + `unit_uuid` FK real con backfill · `070` UNIQUE parcial de reservas (un rechazo ya no bloquea el turno) + disponibilidad real + cancelar aprobadas · `071` FK conversations→profiles (bandeja admin) · `072` no votar cerradas + no borrar órdenes pagadas · `073` CHECK de payments alineado a 'approved' + UNIQUE mp_payment_id · `074` índices FK calientes · `075` invitación por unidad no pisa al ocupante · `076` residentes ven documentos aprobados del consorcio.

**Frontend — corregido:** liquidación a `owner_id || tenant_id` (inquilinos ven su expensa) con advertencia explícita de unidades sin coeficiente; guards de estado en aprobar/rechazar (expensas y pagos); ledger por unidad (OR occupants); `updateProfile` con allow-list; bandeja de chat del admin funcionando + badges de no-leídos reales (messages.read_at); disponibilidad real de reservas + cancelar aprobadas; paquetes reescritos al schema real con selector de destinatario (sección legacy de Accesos eliminada); subida de documentos del admin con signed URLs; tabs expenses/cobranzas accesibles de nuevo; multas con unidad por select y destinatario derivado; email verificado real en Perfil; anti formula-injection en exportaciones; PaymentModal y código muerto eliminados.

**Verificado:** build de producción OK (vite, 0 errores); test en vivo del trigger: residente NO puede cambiar `amount` ni auto-marcarse `paid`, SÍ puede informar pago; índice parcial, FK, triggers, policies y backfill confirmados en la DB.

**Higiene:** carpeta anidada `consorcio-trust/` (271 MB) y 21 `deploy-*.bat` eliminados.

**Queda pendiente (consciente):** fixes de MP/WhatsApp/debt-reminders (§2.2-2.4) antes de encender esas integraciones; conciliación de pagos (rediseño en cola); npm: los avisos restantes requieren majors (vite 7, react-router next) o no tienen fix (xlsx — considerar exceljs); performance de policies (`(select auth.uid())`, consolidación de permisivas); baseline definitivo con `supabase db dump` si se quiere replay perfecto.

**Nota:** los cambios están sin commitear. Commitear desde Windows (el git de la VM ve caché vieja de varios archivos editados y no es confiable como fuente de verdad en esta sesión).

---

### Propuestas de mejora de producto (más allá de los fixes)

- Votación por unidad con peso por coeficiente y quórum configurable — diferenciador real para asambleas argentinas.
- Estado "vencida" real con intereses/punitorios configurables (hoy es solo visual).
- Pagos parciales y multas informables por el residente.
- Doble control de egresos (usar el estado `approved` de órdenes que ya existe).
- Cifrar backups y sacar PII de artifacts de CI.
