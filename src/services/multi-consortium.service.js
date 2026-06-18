import { supabase } from '../lib/supabase';

export async function fetchAllConsortia() {
  const { data, error } = await supabase
    .from('consortia')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function fetchAdminConsortia(adminId) {
  const { data, error } = await supabase
    .from('admin_consortia')
    .select('consortium_id, granted_at, consortia(id, name, address, city)')
    .eq('admin_id', adminId)
    .order('granted_at');
  if (error) { console.warn('fetchAdminConsortia:', error.message); return []; }
  return (data || []).map(r => ({ ...r.consortia, granted_at: r.granted_at }));
}

export async function assignAdminToConsortium(adminId, consortiumId, grantedBy) {
  const { error } = await supabase
    .from('admin_consortia')
    .upsert({ admin_id: adminId, consortium_id: consortiumId, granted_by: grantedBy }, { onConflict: 'admin_id,consortium_id' });
  if (error) throw error;
  // Elevar al usuario a administrador de ese consorcio. Lo permite el super_admin
  // (RLS 'super_admin manage all profiles' + trigger prevent_role_escalation).
  const { error: roleErr } = await supabase
    .from('profiles')
    .update({ role: 'admin', consortium_id: consortiumId })
    .eq('id', adminId);
  if (roleErr) throw roleErr;
}

export async function revokeAdminFromConsortium(adminId, consortiumId) {
  const { error } = await supabase
    .from('admin_consortia')
    .delete()
    .eq('admin_id', adminId)
    .eq('consortium_id', consortiumId);
  if (error) throw error;
}

export async function switchActiveConsortium(userId, consortiumId) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ consortium_id: consortiumId })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createConsortium(name, address, city) {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { data, error } = await supabase
    .from('consortia')
    .insert([{ name, address: address || '', city: city || null, invite_code: code }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchAllAdminAssignments() {
  const { data, error } = await supabase
    .from('admin_consortia')
    .select('admin_id, consortium_id, granted_at, profiles(full_name, email), consortia(name)')
    .order('granted_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Todos los usuarios (para que el super_admin elija a quien hacer admin).
export async function fetchAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .order('full_name');
  if (error) { console.warn('fetchAllUsers:', error.message); return []; }
  return data || [];
}

// Administradores asignados a un consorcio (para listar en el panel).
export async function fetchConsortiumAdmins(consortiumId) {
  const { data, error } = await supabase
    .from('admin_consortia')
    .select('admin_id, profiles(id, full_name, email)')
    .eq('consortium_id', consortiumId);
  if (error) { console.warn('fetchConsortiumAdmins:', error.message); return []; }
  return (data || []).map(r => r.profiles).filter(Boolean);
}

// El super_admin crea un usuario administrador (edge function server-side) y lo
// asigna al consorcio. Devuelve { ok, userId, created, tempPassword }.
export async function createAdminUser({ email, fullName, consortiumId }) {
  const { data, error } = await supabase.functions.invoke('provision-consortium-admin', {
    body: { email, fullName, consortiumId },
  });
  if (error) {
    let msg = error.message;
    try { const ctx = await error.context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* noop */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
