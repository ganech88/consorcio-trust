import { supabase } from '../lib/supabase';

// Unidades del consorcio y su coeficiente (porcentual) de copropiedad.
// La suma de los coeficientes de un consorcio deberia dar 100.

export async function fetchUnits(consortiumId) {
  const { data, error } = await supabase
    .from('units')
    .select('id, name, floor, apartment, balance, coefficient, owner_id, tenant_id')
    .eq('consortium_id', consortiumId)
    .order('name');
  if (error) { console.warn('fetchUnits:', error.message); return []; }
  return data || [];
}

export async function createUnit(consortiumId, unit) {
  const { data, error } = await supabase
    .from('units')
    .insert([{ ...unit, consortium_id: consortiumId }])
    .select('id, name, floor, apartment, balance, coefficient, owner_id, tenant_id')
    .single();
  if (error) throw error;
  return data;
}

export async function updateUnit(unitId, updates) {
  const { data, error } = await supabase
    .from('units')
    .update(updates)
    .eq('id', unitId)
    .select('id, name, floor, apartment, balance, coefficient, owner_id, tenant_id')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteUnit(unitId) {
  const { error } = await supabase.from('units').delete().eq('id', unitId);
  if (error) throw error;
}

// Alta masiva (importar pegando desde Excel). Un solo insert: o entran todas o ninguna.
export async function createUnitsBulk(consortiumId, units) {
  if (!units?.length) return [];
  const { data, error } = await supabase
    .from('units')
    .insert(units.map(u => ({
      name: u.name, floor: u.floor ?? null, apartment: u.apartment ?? null,
      coefficient: u.coefficient ?? null, balance: 0, consortium_id: consortiumId,
    })))
    .select('id, name, floor, apartment, balance, coefficient, owner_id, tenant_id');
  if (error) throw error;
  return data || [];
}
