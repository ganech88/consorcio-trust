#!/usr/bin/env bash
# Aplica las migraciones pendientes y despliega las edge functions al proyecto de producción.
# Requiere SUPABASE_ACCESS_TOKEN (Supabase → Account → Access Tokens) en el entorno.
#   SUPABASE_ACCESS_TOKEN=sbp_... bash scripts/deploy-supabase.sh
set -euo pipefail
PROJECT_REF="${SUPABASE_PROJECT_REF:-kldgbgxycmvywvvftuvi}"
cd "$(dirname "$0")/.."
: "${SUPABASE_ACCESS_TOKEN:?Falta SUPABASE_ACCESS_TOKEN}"

echo "==> link $PROJECT_REF"
npx --yes supabase link --project-ref "$PROJECT_REF"

echo "==> db push (migraciones pendientes)"
npx --yes supabase db push

echo "==> edge functions"
npx --yes supabase functions deploy mercadopago-create-preference --project-ref "$PROJECT_REF"
npx --yes supabase functions deploy mp-webhook --no-verify-jwt --project-ref "$PROJECT_REF"
npx --yes supabase functions deploy whatsapp-webhook --no-verify-jwt --project-ref "$PROJECT_REF"
npx --yes supabase functions deploy debt-reminders --project-ref "$PROJECT_REF"

echo "==> listo. Recordá los secrets: MP_WEBHOOK_SECRET, APP_URL, WHATSAPP_APP_SECRET (Edge Functions → Secrets)."
