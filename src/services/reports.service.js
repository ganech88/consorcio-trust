import { supabase } from '../lib/supabase';

// Cuenta corriente (estado de cuenta) de una unidad: cargos por expensas
// (items de periodo) y multas, para que el admin vea el detalle por unidad.
export async function fetchUnitLedger(unit) {
  const ownerId = unit?.owner_id || null;
  const [itemsRes, finesRes] = await Promise.all([
    ownerId
      ? supabase
          .from('expense_period_items')
          .select('id, amount, status, paid_at, created_at, expense_periods(period, due_date)')
          .eq('user_id', ownerId)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    ownerId
      ? supabase
          .from('fines')
          .select('id, amount, reason, fine_date, status')
          .eq('user_id', ownerId)
          .order('fine_date', { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  return { items: itemsRes.data || [], fines: finesRes.data || [] };
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
