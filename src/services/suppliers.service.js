import { supabase } from '../lib/supabase';

export async function fetchSuppliers(consortiumId) {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('consortium_id', consortiumId)
    .eq('active', true)
    .order('name');
  if (error) { console.warn('fetchSuppliers:', error.message); return []; }
  return data || [];
}

export async function createSupplier(consortiumId, supplier) {
  const { data, error } = await supabase
    .from('suppliers')
    .insert([{ ...supplier, consortium_id: consortiumId }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSupplier(supplierId, updates) {
  const { data, error } = await supabase
    .from('suppliers')
    .update(updates)
    .eq('id', supplierId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSupplier(supplierId) {
  const { error } = await supabase
    .from('suppliers')
    .update({ active: false })
    .eq('id', supplierId);
  if (error) throw error;
}

export async function fetchPaymentOrders(consortiumId, status = null) {
  let query = supabase
    .from('payment_orders')
    .select('*, suppliers(name, category, cuit)')
    .eq('consortium_id', consortiumId)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) { console.warn('fetchPaymentOrders:', error.message); return []; }
  return data || [];
}

export async function createPaymentOrder(consortiumId, userId, order) {
  const { data, error } = await supabase
    .from('payment_orders')
    .insert([{ ...order, consortium_id: consortiumId, created_by: userId }])
    .select('*, suppliers(name, category)')
    .single();
  if (error) throw error;
  return data;
}

export async function updatePaymentOrderStatus(orderId, status, userId = null) {
  const updates = { status };
  if (status === 'paid') {
    updates.paid_at = new Date().toISOString();
    if (userId) updates.paid_by = userId;
  }
  const { data, error } = await supabase
    .from('payment_orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePaymentOrder(orderId) {
  const { error } = await supabase.from('payment_orders').delete().eq('id', orderId);
  if (error) throw error;
}
