import { supabase } from '../lib/supabase';

// Presupuestos de proveedores con flujo de aprobación (consejo/admin).

export async function fetchBudgets(consortiumId, status = null) {
  let query = supabase
    .from('budgets')
    .select('*, suppliers(name, category)')
    .eq('consortium_id', consortiumId)
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) { console.warn('fetchBudgets:', error.message); return []; }
  return data || [];
}

export async function createBudget(consortiumId, userId, budget) {
  const { data, error } = await supabase
    .from('budgets')
    .insert([{ ...budget, consortium_id: consortiumId, created_by: userId }])
    .select('*, suppliers(name, category)')
    .single();
  if (error) throw error;
  return data;
}

export async function decideBudget(id, status, userId) {
  const { data, error } = await supabase
    .from('budgets')
    .update({ status, decided_by: userId, decided_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, suppliers(name, category)')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBudget(id) {
  const { error } = await supabase.from('budgets').delete().eq('id', id);
  if (error) throw error;
}
