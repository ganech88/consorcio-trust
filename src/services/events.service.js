import { supabase } from '../lib/supabase';

export async function fetchEvents(consortiumId) {
  let query = supabase
    .from('events')
    .select('*')
    .order('start_date', { ascending: true });

  if (consortiumId) query = query.eq('consortium_id', consortiumId);

  const { data, error } = await query;
  if (error) { console.warn('events:', error.message); return []; }
  return data || [];
}

export async function createEvent({ title, description, type, startDate, endDate, allDay, consortiumId, createdBy }) {
  const { data, error } = await supabase
    .from('events')
    .insert([{
      title,
      description: description || null,
      type: type || 'general',
      start_date: startDate,
      end_date: endDate || null,
      all_day: allDay ?? true,
      consortium_id: consortiumId || null,
      created_by: createdBy,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEvent(id, updates) {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEvent(id) {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}
