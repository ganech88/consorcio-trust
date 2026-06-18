import { supabase } from '../lib/supabase';

export async function fetchConsortium(consortiumId) {
  if (!consortiumId) return null;
  const { data, error } = await supabase
    .from('consortia')
    .select('*')
    .eq('id', consortiumId)
    .single();
  if (error) { console.warn('fetchConsortium:', error.message); return null; }
  return data;
}

export async function updateConsortium(consortiumId, updates) {
  const { data, error } = await supabase
    .from('consortia')
    .update(updates)
    .eq('id', consortiumId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchConsortiumMembers(consortiumId) {
  if (!consortiumId) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, unit_id, role')
    .eq('consortium_id', consortiumId)
    .order('unit_id');
  if (error) { console.warn('fetchConsortiumMembers:', error.message); return []; }
  return data || [];
}

export async function joinConsortiumByCode(inviteCode, _userId) {
  // El lookup por codigo y el alta se hacen en un RPC SECURITY DEFINER: las
  // politicas RLS de `consortia` no permiten leer un consorcio del que todavia
  // no sos miembro, asi que el select directo siempre fallaba con "invalido".
  const { data, error } = await supabase.rpc('join_consortium_by_code', {
    p_code: inviteCode.trim(),
  });
  if (error) throw new Error(error.message || 'No se pudo unir al consorcio. Intenta de nuevo.');
  const row = Array.isArray(data) ? data[0] : data;
  return { id: row?.consortium_id, name: row?.consortium_name };
}

export async function fetchAllProfiles(consortiumId, { page, pageSize } = {}) {
  if (!consortiumId) return page != null ? { data: [], total: 0, page: 0, pageSize: 20, totalPages: 0 } : [];
  const query = supabase
    .from('profiles')
    .select('id, full_name, unit_id, role, created_at', { count: 'exact' })
    .eq('consortium_id', consortiumId)
    .order('unit_id');

  // Mapa id->nombre de unidad para mostrar etiqueta legible (unit_id es UUID)
  const { data: units } = await supabase.from('units').select('id, name').eq('consortium_id', consortiumId);
  const unitName = Object.fromEntries((units || []).map(u => [u.id, u.name]));
  const withLabel = (rows) => (rows || []).map(r => ({ ...r, unit_label: r.unit_id ? (unitName[r.unit_id] ?? null) : null }));

  if (page != null) {
    const { paginateQuery } = await import('../lib/pagination');
    const res = await paginateQuery(query, page, pageSize);
    return { ...res, data: withLabel(res.data) };
  }

  const { data, error } = await query;
  if (error) { console.warn('fetchAllProfiles:', error.message); return []; }
  return withLabel(data);
}

export async function updateProfileRole(profileId, role) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', profileId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function regenerateInviteCode(consortiumId) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  const { data, error } = await supabase
    .from('consortia')
    .update({ invite_code: code })
    .eq('id', consortiumId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createConsortiumForUser(name, address, city) {
  // RPC SECURITY DEFINER: crea el consorcio y deja al creador como su admin
  // de forma atomica y segura (respeta el trigger anti-escalada de rol).
  const { data, error } = await supabase.rpc('create_consortium_and_become_admin', {
    p_name: name,
    p_address: address || '',
    p_city: city || null,
  });
  if (error) throw error;
  return data;
}

export async function updateReminderSettings(consortiumId, settings) {
  const { data, error } = await supabase
    .from('consortia')
    .update(settings)
    .eq('id', consortiumId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchRemindersLog(consortiumId) {
  const { data, error } = await supabase
    .from('debt_reminders_log')
    .select('*, profiles(full_name, unit_id)')
    .eq('consortium_id', consortiumId)
    .order('sent_at', { ascending: false })
    .limit(50);
  if (error) { console.warn('fetchRemindersLog:', error.message); return []; }
  return data || [];
}

// White-label: datos/logo/firma de la administracion (se muestran en
// expensas, recibos y certificados generados).
export async function updateConsortiumBranding(consortiumId, fields) {
  const { data, error } = await supabase
    .from('consortia')
    .update(fields)
    .eq('id', consortiumId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// El admin crea un residente/propietario (edge function server-side) y lo
// vincula a su unidad. Devuelve { ok, userId, created, tempPassword }.
export async function createConsortiumMember({ email, fullName, consortiumId, unitId, role }) {
  const { data, error } = await supabase.functions.invoke('provision-consortium-member', {
    body: { email, fullName, consortiumId, unitId, role },
  });
  if (error) {
    let msg = error.message;
    try { const ctx = await error.context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* noop */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
