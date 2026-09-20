import { supabase } from '../lib/supabase';

// Cuenta corriente (estado de cuenta) de una unidad: cargos por expensas
// (items de periodo) y multas, para que el admin vea el detalle por unidad.
export async function fetchUnitLedger(unit) {
  if (!unit?.id) return { items: [], fines: [] };
  // Buscamos cargos tanto por la unidad (unit_uuid / unit_id) como por sus
  // ocupantes (owner o inquilino): asi la cuenta no queda vacia si la unidad
  // no tiene owner o si el cargo quedo a nombre del inquilino.
  const occupantIds = [unit.owner_id, unit.tenant_id].filter(Boolean);
  const itemFilters = [`unit_uuid.eq.${unit.id}`];
  // fines.unit_id guarda el nombre de la unidad (texto); contemplamos ambos por compatibilidad
  const fineFilters = [`unit_id.eq.${unit.id}`, `unit_id.eq.${unit.name}`];
  if (occupantIds.length) {
    itemFilters.push(`user_id.in.(${occupantIds.join(',')})`);
    fineFilters.push(`user_id.in.(${occupantIds.join(',')})`);
  }
  const [itemsRes, finesRes, paysRes] = await Promise.all([
    supabase
      .from('expense_period_items')
      .select('id, amount, status, paid_at, created_at, expense_periods(period, due_date)')
      .or(itemFilters.join(','))
      .order('created_at', { ascending: false }),
    supabase
      .from('fines')
      .select('id, amount, reason, fine_date, status')
      .or(fineFilters.join(','))
      .order('fine_date', { ascending: false }),
    supabase
      .from('payments')
      .select('id, amount, status, paid_at, created_at, payment_method, period_item_id, fine_id, notes')
      .eq('unit_id', unit.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false }),
  ]);
  const dedupeById = (rows) => {
    const seen = new Set();
    return (rows || []).filter(r => !seen.has(r.id) && seen.add(r.id));
  };
  return { items: dedupeById(itemsRes.data), fines: dedupeById(finesRes.data), payments: dedupeById(paysRes.data) };
}

// Rendicion: egresos del consorcio (expenses_log) de los ultimos N meses,
// para agregarlos por mes y por categoria en la UI.
export async function fetchAnnualReport(consortiumId, monthsBack = 12) {
  if (!consortiumId) return [];
  const since = new Date();
  since.setMonth(since.getMonth() - (monthsBack - 1));
  since.setDate(1);
  const sinceStr = since.toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('expenses_log')
    .select('amount, category, date, description')
    .eq('consortium_id', consortiumId)
    .gte('date', sinceStr)
    .order('date', { ascending: false });
  if (error) { console.warn('fetchAnnualReport:', error.message); return []; }
  return data || [];
}
