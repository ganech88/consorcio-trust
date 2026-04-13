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
