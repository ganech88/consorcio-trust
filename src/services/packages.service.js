import { supabase } from '../lib/supabase';

// Schema real de `packages` (migración 013): consortium_id, unit_user_id
// (destinatario), logged_by, carrier, description, photo_url,
// status ('pending' | 'collected'), logged_at, collected_at, created_at.

export async function fetchUserPackages(userId) {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .eq('unit_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) { console.warn('packages:', error.message); return []; }
  return data || [];
}

export async function fetchAllPackages(consortiumId) {
  let query = supabase
    .from('packages')
    .select('*')
    .order('created_at', { ascending: false });

  if (consortiumId) query = query.eq('consortium_id', consortiumId);

  const { data: packages, error } = await query;
  if (error) { console.warn('packages:', error.message); return []; }
  if (!packages?.length) return [];

  // Adjuntar el perfil del destinatario (sin depender de un FK embebible)
  const userIds = [...new Set(packages.map(p => p.unit_user_id).filter(Boolean))];
  let profileMap = {};
  if (userIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, unit_id')
      .in('id', userIds);
    profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
  }

  return packages.map(p => ({
    ...p,
    recipient: p.unit_user_id ? (profileMap[p.unit_user_id] || null) : null,
  }));
}

export async function registerPackage({ consortiumId, unitUserId, loggedBy, carrier, description }) {
  const { data, error } = await supabase
    .from('packages')
    .insert([{
      consortium_id: consortiumId || null,
      unit_user_id: unitUserId,
      logged_by: loggedBy,
      carrier: carrier || null,
      description: description || null,
      status: 'pending',
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deliverPackage(id) {
  const { data, error } = await supabase
    .from('packages')
    .update({ status: 'collected', collected_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
