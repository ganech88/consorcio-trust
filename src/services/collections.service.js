import { supabase } from '../lib/supabase';

// Cobranzas no identificadas: se registra un pago anónimo y luego se
// asocia a una unidad/usuario cuando el consorcista se identifica.

export async function fetchUnidentifiedPayments(consortiumId, status = null) {
  let query = supabase
    .from('unidentified_payments')
    .select('*, units(name)')
    .eq('consortium_id', consortiumId)
    .order('paid_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) { console.warn('fetchUnidentifiedPayments:', error.message); return []; }
  return data || [];
}

export async function createUnidentifiedPayment(consortiumId, userId, payment) {
  const { data, error } = await supabase
    .from('unidentified_payments')
    .insert([{ ...payment, consortium_id: consortiumId, created_by: userId }])
    .select('*, units(name)')
    .single();
  if (error) throw error;
  return data;
}

export async function assignUnidentifiedPayment(id, unitId, userId) {
  const { data, error } = await supabase
    .from('unidentified_payments')
    .update({
      status: 'assigned',
      assigned_unit_id: unitId,
      assigned_user_id: userId || null,
      assigned_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*, units(name)')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteUnidentifiedPayment(id) {
  const { error } = await supabase.from('unidentified_payments').delete().eq('id', id);
  if (error) throw error;
}

// Unidades del consorcio (para asociar una cobranza a una UF).
export async function fetchUnitsLite(consortiumId) {
  const { data, error } = await supabase
    .from('units')
    .select('id, name, owner_id, tenant_id')
    .eq('consortium_id', consortiumId)
    .order('name');
  if (error) { console.warn('fetchUnitsLite:', error.message); return []; }
  return data || [];
}
