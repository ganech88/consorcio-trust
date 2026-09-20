@echo off
REM Uso: set SUPABASE_ACCESS_TOKEN=sbp_...  &&  scripts\deploy-supabase.bat
setlocal
if "%SUPABASE_ACCESS_TOKEN%"=="" ( echo Falta SUPABASE_ACCESS_TOKEN & exit /b 1 )
set PROJECT_REF=kldgbgxycmvywvvftuvi
cd /d "%~dp0\.."
call npx --yes supabase link --project-ref %PROJECT_REF% || exit /b 1
call npx --yes supabase db push || exit /b 1
call npx --yes supabase functions deploy mercadopago-create-preference --project-ref %PROJECT_REF% || exit /b 1
call npx --yes supabase functions deploy mp-webhook --no-verify-jwt --project-ref %PROJECT_REF% || exit /b 1
call npx --yes supabase functions deploy whatsapp-webhook --no-verify-jwt --project-ref %PROJECT_REF% || exit /b 1
call npx --yes supabase functions deploy debt-reminders --project-ref %PROJECT_REF% || exit /b 1
echo Listo. Secrets: MP_WEBHOOK_SECRET, APP_URL, WHATSAPP_APP_SECRET.
