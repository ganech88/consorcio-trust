import { supabase } from '../lib/supabase';

export async function fetchExpensesLog(consortiumId) {
  let query = supabase
    .from('expenses_log')
    .select('*')
    .order('date', { ascending: false });

  if (consortiumId) query = query.eq('consortium_id', consortiumId);

  const { data, error } = await query;
  if (error) { console.warn('expenses_log:', error.message); return []; }
  return data || [];
}

export async function addExpenseLog({ description, category, amount, date, provider, consortiumId, createdBy }) {
  const { data, error } = await supabase
    .from('expenses_log')
    .insert([{
      description,
      category,
      amount: Number(amount),
      date,
      provider: provider || null,
      consortium_id: consortiumId || null,
      created_by: createdBy,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchMonthlyFinanceSummary(consortiumId) {
  let query = supabase
    .from('expenses_log')
    .select('date, amount, category')
    .order('date', { ascending: true });

  if (consortiumId) query = query.eq('consortium_id', consortiumId);

  const { data, error } = await query;
  if (error) { console.warn('expenses_log summary:', error.message); return []; }
  if (!data) return [];

  const byMonth = {};
  data.forEach(row => {
    const month = row.date?.slice(0, 7);
    if (!month) return;
    if (!byMonth[month]) byMonth[month] = 0;
    byMonth[month] += Number(row.amount);
  });

  return Object.entries(byMonth).map(([month, total]) => ({ month, total }));
}
