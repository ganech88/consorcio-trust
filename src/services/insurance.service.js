import { supabase } from '../lib/supabase';

// Pólizas de seguro del consorcio (con vencimientos y alertas en la UI).

export async function fetchInsurancePolicies(consortiumId) {
  const { data, error } = await supabase
    .from('insurance_policies')
    .select('*')
    .eq('consortium_id', consortiumId)
    .order('end_date', { ascending: true });
  if (error) { console.warn('fetchInsurancePolicies:', error.message); return []; }
  return data || [];
}

export async function createInsurancePolicy(consortiumId, userId, policy) {
  const { data, error } = await supabase
    .from('insurance_policies')
    .insert([{ ...policy, consortium_id: consortiumId, created_by: userId }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateInsurancePolicy(id, updates) {
  const { data, error } = await supabase
    .from('insurance_policies')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteInsurancePolicy(id) {
  const { error } = await supabase.from('insurance_policies').delete().eq('id', id);
  if (error) throw error;
}
