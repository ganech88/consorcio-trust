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

// Allow-list de columnas que el usuario puede editar de su propio perfil.
// Campos sensibles (role, consortium_id, unit_id, email) se cambian solo por
// flujos de admin / RPCs dedicados, nunca desde este update libre.
const EDITABLE_PROFILE_FIELDS = ['full_name', 'first_name', 'last_name', 'phone', 'avatar_url'];

export async function updateProfile(userId, updates) {
  const safeUpdates = Object.fromEntries(
    Object.entries(updates || {}).filter(([key]) => EDITABLE_PROFILE_FIELDS.includes(key))
  );
  if (Object.keys(safeUpdates).length === 0) {
    throw new Error('No hay campos editables para actualizar.');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(safeUpdates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
