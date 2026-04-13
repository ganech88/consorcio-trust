import { supabase } from '../lib/supabase';

export async function fetchExpenseItems() {
  const { data, error } = await supabase
    .from('expense_items')
    .select('category, amount');

  if (error) throw error;
  if (!data) return [];

  return data.map(e => ({ name: e.category, value: Number(e.amount) }));
}

export async function fetchExpenseSummary(unitId) {
  const { data, error } = await supabase
    .from('expenses_summary')
    .select('period, total_amount, due_date, status')
    .eq('unit_id', unitId)
    .order('period', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.warn('expenses_summary not available:', error.message);
    return null;
  }
  return data;
}

export async function createExpenseItem({ category, amount, consortiumId }) {
  const { data, error } = await supabase
    .from('expense_items')
    .insert([{
      category,
      amount: Number(amount),
      consortium_id: consortiumId || null,
    }])
    .select();

  if (error) throw error;
  return data?.[0];
}

export async function fetchExpensePeriods(consortiumId) {
  let query = supabase
    .from('expense_periods')
    .select('*')
    .order('period', { ascending: false });

  if (consortiumId) query = query.eq('consortium_id', consortiumId);

  const { data, error } = await query;
  if (error) { console.warn('expense_periods:', error.message); return []; }
  return data || [];
}

export async function createExpensePeriod({ period, totalAmount, dueDate, consortiumId, createdBy }) {
  const { data, error } = await supabase
    .from('expense_periods')
    .insert([{
      period,
      total_amount: Number(totalAmount),
      due_date: dueDate,
      consortium_id: consortiumId || null,
      created_by: createdBy,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchPeriodItems(periodId) {
  const { data, error } = await supabase
    .from('expense_period_items')
    .select('*, profiles(full_name, unit_id)')
    .eq('period_id', periodId)
    .order('unit_id');

  if (error) throw error;
  return data || [];
}

export async function fetchUserPeriodItems(userId) {
  const { data, error } = await supabase
    .from('expense_period_items')
    .select('*, expense_periods(period, due_date)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) { console.warn('expense_period_items:', error.message); return []; }
  return data || [];
}

export async function createPeriodItems(items) {
  const { data, error } = await supabase
    .from('expense_period_items')
    .insert(items)
    .select();

  if (error) throw error;
  return data || [];
}

export async function updatePeriodItemStatus(itemId, status) {
  const updates = { status };
  if (status === 'paid') updates.paid_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('expense_period_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export const fetchExpenses = async (consortiumId, { page, pageSize } = {}) => {
  const query = supabase
    .from('expenses')
    .select('*, expense_payments(*)', { count: 'exact' })
    .eq('consortium_id', consortiumId)
    .order('due_date', { ascending: false });

  if (page != null) {
    const { paginateQuery } = await import('../lib/pagination');
    return paginateQuery(query, page, pageSize);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const createExpense = async (consortiumId, userId, expense) => {
  const { data, error } = await supabase
    .from('expenses')
    .insert({ ...expense, consortium_id: consortiumId, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateExpense = async (expenseId, updates) => {
  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', expenseId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteExpense = async (expenseId) => {
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
  if (error) throw error;
};

export const createExpensePayment = async (expenseId, userId, payment) => {
  const { data, error } = await supabase
    .from('expense_payments')
    .insert({ ...payment, expense_id: expenseId, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updatePaymentStatus = async (paymentId, status, notes) => {
  const { data, error } = await supabase
    .from('expense_payments')
    .update({ status, notes })
    .eq('id', paymentId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export async function fetchExpenseReport(expenseId) {
  const { data, error } = await supabase
    .from('expense_payments')
    .select(`
      id,
      amount,
      status,
      paid_at,
      notes,
      profiles (
        full_name,
        email,
        unit_id,
        phone
      )
    `)
    .eq('expense_id', expenseId);

  if (error) throw error;

  const rows = data || [];
  const totalAmount = rows.reduce((s, r) => s + Number(r.amount), 0);

  return rows.map(r => ({
    unidad:       r.profiles?.unit_id || '—',
    propietario:  r.profiles?.full_name || '—',
    email:        r.profiles?.email || '—',
    telefono:     r.profiles?.phone || '—',
    monto:        Number(r.amount),
    porcentaje:   totalAmount > 0 ? ((Number(r.amount) / totalAmount) * 100).toFixed(2) + '%' : '—',
    estado:       r.status === 'paid' ? 'Pagado' : 'Pendiente',
    fecha_pago:   r.paid_at ? new Date(r.paid_at).toLocaleDateString('es-AR') : '—',
    notas:        r.notes || '',
  }));
}
