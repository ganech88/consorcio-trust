import { supabase } from '../lib/supabase';

export async function fetchMpConfig(consortiumId) {
  const { data, error } = await supabase
    .from('mp_config_safe')
    .select('id, public_key, enabled')
    .eq('consortium_id', consortiumId)
    .maybeSingle();
  if (error) { console.warn('fetchMpConfig:', error.message); return null; }
  return data;
}

export async function saveMpConfig(consortiumId, config) {
  const { data, error } = await supabase.functions.invoke('mp-config', {
    method: 'POST',
    body: { consortium_id: consortiumId, ...config },
  });
  if (error) throw error;
  return data;
}

export async function createMpPreference(expenseId, userId, amount, consortiumId) {
  const { data, error } = await supabase.functions.invoke('mercadopago-create-preference', {
    body: { expenseId, userId, amount, consortiumId },
  });
  if (error) throw error;
  return data;
}
