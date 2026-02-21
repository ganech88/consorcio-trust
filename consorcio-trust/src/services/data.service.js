import { supabase } from '../lib/supabase';

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
