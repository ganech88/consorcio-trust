import { supabase } from '../lib/supabase';

export async function fetchPackages(userId) {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .eq('user_id', userId)
    .order('received_at', { ascending: false });

  if (error) { console.warn('packages:', error.message); return []; }
  return data || [];
}

export async function fetchAllPackages() {
  const { data, error } = await supabase
    .from('packages')
    .select('*, profiles(full_name, unit_id)')
    .order('received_at', { ascending: false });

  if (error) { console.warn('packages:', error.message); return []; }
  return data || [];
}

export async function registerPackage({ unitId, userId, description, consortiumId }) {
  const { data, error } = await supabase
    .from('packages')
    .insert([{
      unit_id: unitId,
      user_id: userId,
      description,
      consortium_id: consortiumId || null,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deliverPackage(id) {
  const { data, error } = await supabase
    .from('packages')
    .update({ delivered_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchUserPackages(userId, isAdmin = false) {
  let query = supabase
    .from('packages')
    .select('*')
    .order('created_at', { ascending: false });

  if (!isAdmin) {
    query = query.eq('unit_user_id', userId);
  }

  const { data, error } = await query;
  if (error) { console.warn('packages (013):', error.message); return []; }
  return data || [];
}

export async function createPackage({ consortiumId, carrier, description, loggedBy }) {
  const { data, error } = await supabase
    .from('packages')
    .insert([{
      consortium_id: consortiumId || null,
      carrier: carrier || null,
      description,
      logged_by: loggedBy,
      status: 'pending',
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function collectPackage(id) {
  const { data, error } = await supabase
    .from('packages')
    .update({ status: 'collected', collected_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
