import { supabase } from '../lib/supabase';

export async function fetchUserProfile(userId) {
  if (!userId) throw new Error('fetchUserProfile: userId requerido');

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, unit_id, consortium_id, role')
    .eq('id', userId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  // Resolver el nombre legible de la unidad (unit_id es un UUID -> units.name)
  if (data?.unit_id) {
    const { data: u } = await supabase.from('units').select('name').eq('id', data.unit_id).maybeSingle();
    data.unit_label = u?.name ?? null;
  }
  return data;
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
