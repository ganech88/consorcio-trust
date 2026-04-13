import { supabase } from '../lib/supabase';

const RECURRENCE_DAYS = {
  weekly:    7,
  monthly:   30,
  quarterly: 90,
  biannual:  180,
  annual:    365,
};

export async function fetchMaintenanceTasks(consortiumId) {
  let query = supabase
    .from('maintenance_tasks')
    .select('*')
    .order('next_due', { ascending: true });

  if (consortiumId) query = query.eq('consortium_id', consortiumId);

  const { data, error } = await query;
  if (error) { console.warn('maintenance_tasks:', error.message); return []; }
  return data || [];
}

export async function createMaintenanceTask({ consortiumId, name, category, recurrence, nextDue, estimatedCost, notes, createdBy }) {
  const { data, error } = await supabase
    .from('maintenance_tasks')
    .insert([{
      consortium_id: consortiumId || null,
      name,
      category: category || null,
      recurrence: recurrence || 'monthly',
      next_due: nextDue || null,
      estimated_cost: estimatedCost || null,
      notes: notes || null,
      created_by: createdBy,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function completeMaintenanceTask(id) {
  const today = new Date().toISOString().split('T')[0];

  const { data: task, error: fetchErr } = await supabase
    .from('maintenance_tasks')
    .select('recurrence')
    .eq('id', id)
    .single();

  if (fetchErr) throw fetchErr;

  const days = RECURRENCE_DAYS[task?.recurrence] || 30;
  const nextDue = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('maintenance_tasks')
    .update({ last_completed: today, next_due: nextDue })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
