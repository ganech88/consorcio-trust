// Edge Function: provision-consortium-member
// Permite que un ADMIN (o super_admin) cree un residente/propietario y lo
// vincule a su unidad, del lado del servidor (service role key). Devuelve una
// contrasena temporal para compartirle a la persona.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const authHeader = req.headers.get('Authorization') ?? '';

    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: uErr } = await caller.auth.getUser();
    if (uErr || !user) return json({ error: 'No autenticado' }, 401);

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const fullName = String(body.fullName || '').trim();
    const consortiumId = String(body.consortiumId || '');
    const unitId = body.unitId ? String(body.unitId) : null;
    const role = String(body.role || 'resident');
    if (!email || !consortiumId) return json({ error: 'Faltan el email y/o el consorcio.' }, 400);
    if (role !== 'owner' && role !== 'resident') return json({ error: 'Rol invalido.' }, 400);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // Solo admin de ESE consorcio (o super_admin) puede agregar miembros
    const { data: cp } = await admin.from('profiles').select('role, consortium_id').eq('id', user.id).maybeSingle();
    const isSuper = cp?.role === 'super_admin';
    const isConsAdmin = cp?.role === 'admin' && cp?.consortium_id === consortiumId;
    if (!isSuper && !isConsAdmin) {
      return json({ error: 'Solo el administrador del consorcio puede agregar miembros.' }, 403);
    }

    // Crear el usuario (o reutilizarlo si ya existe)
    const tempPassword = (body.password ? String(body.password) : '').trim()
      || ('Ct' + Math.random().toString(36).slice(2, 10) + 'A!');
    let userId;
    let created = false;
    const { data: cdata, error: cErr } = await admin.auth.admin.createUser({
      email, password: tempPassword, email_confirm: true, user_metadata: { full_name: fullName },
    });
    if (cErr) {
      if (/already.*registered|already.*exists|duplicate/i.test(cErr.message)) {
        const { data: existing } = await admin.from('profiles').select('id').eq('email', email).maybeSingle();
        if (!existing) return json({ error: 'El email ya esta registrado pero no se ubico su perfil.' }, 409);
        userId = existing.id;
      } else {
        return json({ error: cErr.message }, 400);
      }
    } else {
      userId = cdata?.user?.id;
      created = true;
    }

    const { error: pErr } = await admin.rpc('provision_member', {
      p_user_id: userId, p_consortium_id: consortiumId, p_unit_id: unitId, p_role: role, p_full_name: fullName,
    });
    if (pErr) return json({ error: pErr.message }, 400);

    return json({ ok: true, userId, created, tempPassword: created ? tempPassword : null });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
