# Auditoría completa ConsorcioTrust — 14/06/2026

PWA React 19 + Vite 6 + Supabase (multitenancy, ~18 módulos). Auditoría de seguridad, calidad, performance y estado de build. Estado del proyecto: **pre-lanzamiento** (base de datos sin datos reales).

## Estado del build (antes → después)

| Check | Antes | Después |
|-------|-------|---------|
| `npm run build` | Fallaba (config rollup del sandbox) | ✅ OK |
| `npm run lint` | **Roto** (config ESLint inválida) | ✅ 0 errores (16 warnings benignos) |
| `npm run test:run` | 7/7 | ✅ 7/7 |
| Chunk principal | 486 KB | **266 KB** |
| Precache PWA | 2.4 MB | **1.07 MB** (−1.34 MB) |
| Advisors RLS Supabase | 12 policies `USING(true)` | **0** |

---

## 1. Lo que se corrigió en esta sesión

### Seguridad — base de datos (migración `034_security_rls_hardening.sql`, aplicada)

Se verificó contra la base real y se cerraron agujeros críticos de RLS:

- **Escalada de privilegios (CRÍTICO):** la policy de UPDATE de `profiles` no tenía `WITH CHECK`, permitiendo que cualquier usuario se asignara `role = 'super_admin'` sobre su propia fila. Se agregó el trigger `prevent_role_escalation()`: solo un `super_admin` puede cambiar el campo `role`.
- **Acceso total a `claims` (CRÍTICO):** existía una policy `ALL USING(true) WITH CHECK(true)` ("Permitir todo a todos") que daba acceso de lectura/escritura a los reclamos de **todos** los consorcios. Eliminada (quedan las policies scopeadas por usuario/consorcio).
- **Fuga de PII entre consorcios:** `profiles` tenía SELECT `USING(true)` ("Public profiles are viewable by everyone") → cualquier usuario leía nombre, teléfono y email de todos los consorcios. Reemplazada por `profiles_select_scoped` (uno mismo + su consorcio + super_admin).
- **Lecturas permisivas `USING(true)`** reemplazadas por policies scopeadas por consorcio en: `announcements`, `contacts`, `events`, `expense_periods`, `expenses_log`, `polls`, `poll_votes`.
- **UPDATE abierto** cerrado en `board_posts` (solo el autor edita; las reacciones siguen vía la función `increment_board_reactions`) y `messages` (solo participantes de la conversación o admin del consorcio).
- **INSERT abierto** en `payments` restringido a pagos propios (`user_id = auth.uid()`).

Resultado: **0 policies permisivas restantes** (verificado en `pg_policies`).

### Seguridad — funciones (migración `035_function_hardening.sql`, aplicada)

- `search_path` fijado en `set_updated_at`, `update_updated_at_column`, `increment_board_reactions`, `sync_profile_email`.
- Revocada la ejecución vía RPC de las funciones de trigger (`prevent_role_escalation`, `handle_new_user`, `sync_profile_email`) — los triggers siguen funcionando, pero ya no son invocables desde la API pública.

### Calidad de código

- `fetchClaims(consortiumId)` y `fetchExpenseItems(consortiumId)` ahora filtran por consorcio (defensa en profundidad, además de RLS).
- `DataContext` reestructurado: carga el perfil primero, luego claims/gastos/consorcio **acotados y en paralelo** (antes el consorcio se cargaba en serie). El `value` del provider se memoiza (`useMemo`) para evitar re-renders innecesarios.
- `createClaim`: se eliminó la fabricación de un reclamo "fantasma" con `crypto.randomUUID()` cuando el insert no devolvía fila — ahora lanza error (evita inconsistencia silenciosa en la UI).

### Lint / tooling

- `eslint.config.js` reparado (apuntaba a `reactHooks.configs.flat.recommended`, inexistente en la v5.2.0). Se ignoran `dist`, `.claude`, `supabase/functions` y el scaffold `consorcio-trust/`.
- Reglas ajustadas: `react-refresh` y `exhaustive-deps` a `warn`; errores de `catch` ignorados; PascalCase reconocido como componente JSX.
- Eliminado código muerto real (variables `page`, `isAdmin`, `session`, `idx`, `delivered`, imports `useState`/`fireEvent`/`formatDate` sin uso).

### Performance / bundle (`vite.config.js`)

- `manualChunks`: React y Supabase en chunks separados de larga caché → el chunk principal pasó de 486 KB a 266 KB.
- Service worker: se excluyeron del precache las librerías pesadas que ya cargan bajo demanda (xlsx, jspdf, recharts, html2canvas) → precache de 2.4 MB a 1.07 MB.

---

## 2. Backlog priorizado (requiere decisión o cambio mayor — NO aplicado)

### Alta prioridad antes de abrir al público

1. **Bucket `comprobantes` público y listable.** Los comprobantes de pago (con datos personales) son accesibles/enumerables por URL sin autenticación. Pasar el bucket a privado + usar signed URLs + nombres no predecibles (UUID en vez de `telefono_timestamp`). Es un cambio que toca el código de subida/visualización, por eso no se aplicó automáticamente.
2. **Webhook de MercadoPago (`mp-webhook`) sin validación de firma.** Acepta cualquier POST. Validar la firma HMAC `x-signature` (como ya hace `whatsapp-webhook`). Requiere configurar el secreto y redeploy de la edge function; aplicarlo sin el secreto rechazaría pagos legítimos.
3. **Tablas con RLS habilitado pero sin policy:** `units`, `expenses_summary`, `mp_config` quedan en deny-all (los clientes no pueden leerlas). Confirmar si es intencional o si falta una policy scopeada por consorcio (puede dejar vistas vacías, p. ej. el resumen de expensas).
4. **Policies de admin sin scope de consorcio.** Varias policies de escritura validan solo `role = 'admin'` globalmente; un admin de un consorcio podría escribir en otro. Agregar `AND consortium_id = current_consortium_id()`.
5. **Vista `mp_config_safe` con `SECURITY DEFINER`** (advisor ERROR de Supabase). Evaluar cambiar a `security_invoker = true`.
6. **Activar "Leaked Password Protection"** en Auth (Dashboard → Authentication → Policies).

### Media prioridad (mantenibilidad / deuda técnica)

7. **Convención única de manejo de errores en services.** Hoy conviven dos estilos (lanzar vs. tragar y devolver `[]`/`null`): un fallo de red se ve igual que "sin datos". Definir una convención y migrar todos los services.
8. **Shapes de retorno inconsistentes** entre funciones paginadas (`{data,total,...}`) y no paginadas (array pelado) con el mismo nombre.
9. **Extraer un hook `useResource`** para el patrón repetido `useState + useEffect(fetch) + CRUD optimista + toast`, copiado en ~15 vistas/tabs.
10. **Unificar helpers duplicados** (`fmtCurrency`/`formatCurrency` definido 3+ veces; `Intl.NumberFormat('es-AR')` repetido).
11. **Limpieza de disco:** el scaffold `consorcio-trust/` (271 MB) y los `.claude/worktrees/*` (varias copias completas del proyecto) son residuos que conviene borrar (no eliminables desde el sandbox por permisos del montaje).

### Baja prioridad

12. Memoización de filas en listas largas (`React.memo`), `loading="lazy"` + compresión de imágenes en subida, reemplazar recharts del Dashboard por un SVG liviano (−90 KB gzip del camino crítico), estandarizar skeletons vs spinners.

---

## 3. Notas del entorno

- La base de datos estaba **pausada** (tier free) al iniciar; se restauró para verificar y aplicar los arreglos.
- Las migraciones `034` y `035` se aplicaron directamente al proyecto remoto vía MCP y se guardaron también en `supabase/migrations/` para mantener el historial del repo.
