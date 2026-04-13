import { supabase } from '../lib/supabase';

export async function fetchVisitors(userId) {
  const { data, error } = await supabase
    .from('visitors')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) { console.warn('visitors:', error.message); return []; }
  return data || [];
}

export async function addVisitor({ unitId, userId, name, docNumber, consortiumId }) {
  const { data, error } = await supabase
    .from('visitors')
    .insert([{
      unit_id: unitId,
      user_id: userId,
      name,
      doc_number: docNumber || null,
      consortium_id: consortiumId || null,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeVisitor(id) {
  const { error } = await supabase.from('visitors').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchAuthorizedVisitors(userId) {
  let query = supabase
    .from('authorized_visitors')
    .select('*')
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) { console.warn('authorized_visitors:', error.message); return []; }
  return data || [];
}

export async function createAuthorizedVisitor({ consortiumId, userId, visitorName, visitorType, validFrom, validUntil, timeFrom, timeTo, note }) {
  const { data, error } = await supabase
    .from('authorized_visitors')
    .insert([{
      consortium_id: consortiumId || null,
      user_id: userId,
      visitor_name: visitorName,
      visitor_type: visitorType || 'Visita',
      valid_from: validFrom || null,
      valid_until: validUntil || null,
      time_from: timeFrom || null,
      time_to: timeTo || null,
      note: note || null,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function checkInVisitor(id, checkedInBy) {
  const { data, error } = await supabase
    .from('authorized_visitors')
    .update({ checked_in_at: new Date().toISOString(), checked_in_by: checkedInBy })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
