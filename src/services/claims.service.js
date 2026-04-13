import { supabase } from '../lib/supabase';

export async function fetchClaims() {
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createClaim({ title, category, description, consortiumId, userId }) {
  const { data, error } = await supabase
    .from('claims')
    .insert([{
      title,
      category: category || null,
      description: description || null,
      status: 'open',
      consortium_id: consortiumId,
      user_id: userId,
    }])
    .select();

  if (error) throw error;
  return data?.[0] ?? {
    title, category, description,
    status: 'open',
    created_at: new Date().toISOString(),
    id: crypto.randomUUID(),
  };
}

export async function fetchAllClaims({ page, pageSize } = {}) {
  const query = supabase
    .from('claims')
    .select('*, profiles(full_name, unit_id)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (page != null) {
    const { paginateQuery } = await import('../lib/pagination');
    return paginateQuery(query, page, pageSize);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function updateClaimStatus(claimId, status, adminNote, adminUserId) {
  const updates = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (adminNote !== undefined) updates.admin_note = adminNote;
  if (adminUserId) updates.responded_by = adminUserId;

  const { data, error } = await supabase
    .from('claims')
    .update(updates)
    .eq('id', claimId)
    .select();

  if (error) throw error;
  return data?.[0];
}
