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

export async function addExpenseLog({ description, category, amount, date, provider, receiptUrl, consortiumId, createdBy }) {
  const { data, error } = await supabase
    .from('expenses_log')
    .insert([{
      description,
      category,
      amount: Number(amount),
      date,
      provider: provider || null,
      receipt_url: receiptUrl || null,
      consortium_id: consortiumId || null,
      created_by: createdBy,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Egresos del consorcio agrupados por categoria (para el Dashboard 'Destino de tus Fondos').
// Fuente canonica: expenses_log (reemplaza al antiguo expense_items/expenses_summary).
export async function fetchExpenseBreakdown(consortiumId) {
  let query = supabase.from('expenses_log').select('category, amount');
  if (consortiumId) query = query.eq('consortium_id', consortiumId);
  const { data, error } = await query;
  if (error) { console.warn('expense breakdown:', error.message); return []; }
  const byCat = {};
  (data || []).forEach((r) => {
    const cat = r.category || 'Otros';
    byCat[cat] = (byCat[cat] || 0) + Number(r.amount);
  });
  return Object.entries(byCat).map(([name, value]) => ({ name, value }));
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

// Suma de egresos (expenses_log) de un mes 'YYYY-MM' para sugerir el total de la liquidacion.
export async function fetchEgresosTotalForPeriod(consortiumId, period) {
  if (!consortiumId || !period) return 0;
  const start = period + '-01';
  const [y, m] = period.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const { data, error } = await supabase
    .from('expenses_log')
    .select('amount')
    .eq('consortium_id', consortiumId)
    .gte('date', start)
    .lt('date', next);
  if (error) { console.warn('egresos total:', error.message); return 0; }
  return (data || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
}
