# Backup y recuperación de datos — ConsorcioTrust

El plan **free** de Supabase **no** incluye point-in-time recovery (PITR) ni
backups automáticos diarios. Para no depender de eso, este repo trae un
esquema de resguardo propio.

## Capas de protección

1. **Backup automático diario (recomendado)** — GitHub Action `.github/workflows/backup.yml`.
   Corre todos los días, exporta toda la base a un JSON y lo guarda como
   *artifact* privado del repo (retención 90 días).
2. **Backup manual on-demand** — `node scripts/backup.mjs` desde tu compu.
3. **Para producción real** — pasar el proyecto Supabase a **plan Pro**, que
   habilita PITR y backups gestionados. Esta es la red de seguridad definitiva;
   las capas 1 y 2 son el mientras tanto.

## Configurar el backup automático

En GitHub → repo → **Settings → Secrets and variables → Actions**, crear:

- `SUPABASE_URL` = `https://kldgbgxycmvywvvftuvi.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = el **service_role** key (Supabase → Project Settings → API).

> El `service_role` key saltea RLS (lee todo). Es secreto: va solo como
> secret de Actions / variable de entorno, **nunca** en el código ni en el repo.

Listo: corre solo a las 06:00 UTC. Para correrlo a mano: pestaña **Actions →
Backup DB → Run workflow**. El backup queda en **Artifacts** de esa corrida.

## Backup manual

```bash
export SUPABASE_URL="https://kldgbgxycmvywvvftuvi.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="..."   # service_role
node scripts/backup.mjs
# -> backups/consorciotrust-backup-<timestamp>.json
```

Guardá ese archivo en un lugar **privado** (tiene datos personales). No se
versiona en git (`backups/` está en `.gitignore`).

## Restaurar (emergencia)

Ante una base vacía o corrupta, sobre un proyecto Supabase con el esquema ya
creado (corré antes las migraciones de `supabase/migrations/`):

```bash
export SUPABASE_URL="..."
export SUPABASE_SERVICE_ROLE_KEY="..."
export RESTORE_CONFIRM=YES
node scripts/restore.mjs backups/consorciotrust-backup-<timestamp>.json
```

`restore.mjs` re-crea los usuarios de Auth y hace `upsert` de todas las tablas
en orden de claves foráneas. **Los usuarios se restauran sin contraseña** (los
hashes no se exportan): cada uno entra con "Olvidé mi contraseña".

## Detalles

- Se exportan todas las tablas de negocio + `auth.users` (sin password hashes).
- Se **excluye `mp_config`** a propósito: contiene el `access_token` de
  MercadoPago (secreto). Se recarga a mano por consorcio tras un restore.
- Si agregás tablas nuevas, sumalas a la lista `TABLES` en `scripts/backup.mjs`.
