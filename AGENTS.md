# AGENTS.md

Instrucciones para agentes de código (Claude Code, Codex, Cursor, etc.) que trabajen en **ConsorcioTrust**.

La guía completa está en [`CLAUDE.md`](./CLAUDE.md): qué es el producto, comandos, reglas del repo (migraciones, RLS, plata server-side, lógica pura en `src/lib/` con tests) y mapa de archivos. Este archivo existe para que cualquier agente la encuentre; no dupliques contenido acá.

Resumen mínimo:

- `npm run lint && npm run typecheck && npm run test:run && npm run build` antes de terminar.
- Nunca editar una migración aplicada; crear `supabase/migrations/NNN_*.sql` nueva.
- Toda tabla con RLS por consorcio. Montos y estados de pago se deciden en el servidor.
- Commits: conventional commits en español.
