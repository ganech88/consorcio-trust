// Edge Function: provision-consortium-admin
// Permite que un SUPER_ADMIN cree un usuario administrador y lo asigne a un
// consorcio, en un solo paso y del lado del servidor (usa la service role key,
// que nunca debe estar en el cliente). Devuelve una contraseña temporal para
// compartirle al nuevo admin.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const authHeader = req.headers.get('Authorization') ?? '';

    // 1) Verificar que quien llama es super_admin
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: uErr } = await caller.auth.getUser();
    if (uErr || !user) return json({ error: 'No autenticado' }, 401);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (prof?.role !== 'super_admin') {
      return json({ error: 'Solo el super administrador puede crear administradores.' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const fullName = String(body.fullName || '').trim();
    const consortiumId = String(body.consortiumId || '');
    if (!email || !consortiumId) return json({ error: 'Faltan el email y/o el consorcio.' }, 400);

    // 2) Crear el usuario de Auth (o reutilizarlo si ya existe)
    const tempPassword = (body.password ? String(body.password) : '').trim()
      || ('Ct' + Math.random().toString(36).slice(2, 10) + 'A!');
    let userId: string | undefined;
    let created = false;
    const { data: cdata, error: cErr } = await admin.auth.admin.createUser({
      email, password: tempPassword, email_confirm: true, user_metadata: { full_name: fullName },
    });
    if (cErr) {
      if (/already.*registered|already.*exists|duplicate/i.test(cErr.message)) {
        const { data: existing } = await admin.from('profiles').select('id').eq('email', email).maybeSingle();
        if (!existing) return json({ error: 'El email ya está registrado pero no se ubicó su perfil.' }, 409);
        userId = existing.id;
      } else {
        return json({ error: cErr.message }, 400);
      }
    } else {
      userId = cdata?.user?.id;
      created = true;
    }

    // 3) Elevar a admin del consorcio (RPC server-side, gateado a service_role)
    const { error: pErr } = await admin.rpc('provision_admin', {
      p_user_id: userId, p_consortium_id: consortiumId, p_full_name: fullName, p_granted_by: user.id,
    });
    if (pErr) return json({ error: pErr.message }, 400);

    return json({ ok: true, userId, created, tempPassword: created ? tempPassword : null });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
