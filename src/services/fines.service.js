import { supabase } from '../lib/supabase';

export async function fetchFines(consortiumId, { page, pageSize } = {}) {
  const query = supabase
    .from('fines')
    .select('*, profiles!fines_user_id_fkey(full_name, unit_id)', { count: 'exact' })
    .eq('consortium_id', consortiumId)
    .order('created_at', { ascending: false });

  if (page != null) {
    const { paginateQuery } = await import('../lib/pagination');
    return paginateQuery(query, page, pageSize);
  }

  const { data, error } = await query;
  if (error) { console.warn('fines:', error.message); return []; }
  return data || [];
}

export async function fetchUnitFines(unitId, consortiumId) {
  const { data, error } = await supabase
    .from('fines')
    .select('*')
    .eq('unit_id', unitId)
    .eq('consortium_id', consortiumId)
    .eq('status', 'active')
    .order('fine_date', { ascending: false });

  if (error) { console.warn('fetchUnitFines:', error.message); return []; }
  return data || [];
}

export async function fetchMyFines(userId) {
  const { data, error } = await supabase
    .from('fines')
    .select('*')
    .eq('user_id', userId)
    .order('fine_date', { ascending: false });

  if (error) { console.warn('fetchMyFines:', error.message); return []; }
  return data || [];
}

export async function createFine({ consortiumId, unitId, userId, amount, reason, period, notes, appliedBy, attachmentUrl }) {
  const { data, error } = await supabase
    .from('fines')
    .insert([{
      consortium_id: consortiumId,
      unit_id: unitId,
      user_id: userId || null,
      amount: Number(amount),
      reason,
      period: period || null,
      notes: notes || null,
      applied_by: appliedBy,
      attachment_url: attachmentUrl || null,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateFineStatus(fineId, status) {
  const { data, error } = await supabase
    .from('fines')
    .update({ status })
    .eq('id', fineId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteFine(fineId) {
  const { error } = await supabase.from('fines').delete().eq('id', fineId);
  if (error) throw error;
}

export async function fetchFinesSummaryByPeriod(consortiumId, period) {
  const { data, error } = await supabase
    .from('fines')
    .select('amount')
    .eq('consortium_id', consortiumId)
    .eq('period', period)
    .eq('status', 'active');

  if (error) { console.warn('fetchFinesSummaryByPeriod:', error.message); return 0; }
  return (data || []).reduce((sum, f) => sum + Number(f.amount), 0);
}

// Todas las multas activas del consorcio (para mostrar el detalle a todos los
// miembros; cada uno paga solo la suya). Requiere la policy de la migracion 064.
export async function fetchConsortiumFines(consortiumId) {
  if (!consortiumId) return [];
  const { data, error } = await supabase
    .from('fines')
    .select('id, amount, reason, status, fine_date, period, unit_id, user_id, notes')
    .eq('consortium_id', consortiumId)
    .eq('status', 'active')
    .order('fine_date', { ascending: false });
  if (error) { console.warn('fetchConsortiumFines:', error.message); return []; }
  const unitIds = [...new Set((data || []).map(f => f.unit_id).filter(Boolean))];
  let unitName = {};
  if (unitIds.length) {
    const { data: units } = await supabase.from('units').select('id, name').in('id', unitIds);
    unitName = Object.fromEntries((units || []).map(u => [u.id, u.name]));
  }
  return (data || []).map(f => ({ ...f, unit_name: f.unit_id ? (unitName[f.unit_id] || null) : null }));
}
