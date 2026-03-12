import { supabase } from '../lib/supabase';

export async function fetchUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, unit_id, consortium_id')
    .eq('id', userId)
    .limit(1)
    .single();

  if (error) {
    const { data: fallback } = await supabase
      .from('profiles')
      .select('id, full_name, phone, unit_id, consortium_id')
      .limit(1)
      .single();
    return fallback;
  }
  return data;
}

export async function fetchClaims() {
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createClaim({ title, consortiumId, userId }) {
  const { data, error } = await supabase
    .from('claims')
    .insert([{
      title,
      status: 'open',
      consortium_id: consortiumId,
      user_id: userId,
    }])
    .select();

  if (error) throw error;
  return data?.[0] ?? { title, status: 'open', created_at: new Date().toISOString(), id: crypto.randomUUID() };
}

export async function fetchExpenses() {
  const { data, error } = await supabase
    .from('expense_items')
    .select('category, amount');

  if (error) throw error;
  if (!data) return [];

  return data.map(e => ({ name: e.category, value: Number(e.amount) }));
}

export async function uploadPaymentProof(file) {
  const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;

  const { error: uploadError } = await supabase.storage
    .from('comprobantes')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('comprobantes')
    .getPublicUrl(fileName);

  return { fileName, publicUrl };
}

export async function savePaymentRecord({ amount, proofUrl, userId, unitId }) {
  const { data, error } = await supabase
    .from('payments')
    .insert([{
      amount,
      status: 'pending',
      proof_url: proofUrl,
      user_id: userId,
      unit_id: unitId,
    }])
    .select();

  if (error) throw error;
  return data?.[0];
}

export async function fetchPayments(userId) {
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, status, proof_url, created_at, unit_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  return data || [];
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
