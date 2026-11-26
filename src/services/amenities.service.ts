import { supabase } from '../lib/supabase';

// Espacios comunes del consorcio (SUM, parrilla, etc.). Cada consorcio carga los
// suyos; `number` es el correlativo que guardan las reservas en `amenity_id`.
// `database.types.ts` todavía no incluye las columnas de la migración 080.
const db = supabase as any;

export interface Amenity {
  id: string;
  consortium_id: string;
  number: number;
  name: string;
  description: string | null;
  capacity: number | null;
  icon: string | null;
  active: boolean;
  requires_approval: boolean;
}

export interface AmenityInput {
  name: string;
  description?: string | null;
  capacity?: number | null;
  icon?: string | null;
}

const COLUMNS = 'id, consortium_id, number, name, description, capacity, icon, active, requires_approval';

export async function fetchAmenities(consortiumId: string | null | undefined, { onlyActive = false } = {}): Promise<Amenity[]> {
  if (!consortiumId) return [];
  let query = db.from('amenities').select(COLUMNS).eq('consortium_id', consortiumId).order('number');
  if (onlyActive) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createAmenity(consortiumId: string, input: AmenityInput): Promise<Amenity> {
  const { data, error } = await db.from('amenities')
    .insert([{ consortium_id: consortiumId, ...cleanInput(input) }])
    .select(COLUMNS).single();
  if (error) throw error;
  return data;
}

export async function updateAmenity(id: string, updates: Partial<AmenityInput> & { active?: boolean }): Promise<Amenity> {
  const patch: Record<string, unknown> = { ...cleanInput(updates as AmenityInput, true) };
  if (updates.active !== undefined) patch.active = updates.active;
  const { data, error } = await db.from('amenities').update(patch).eq('id', id).select(COLUMNS).single();
  if (error) throw error;
  return data;
}

function cleanInput(input: AmenityInput, partial = false): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!partial || input.name !== undefined) out.name = (input.name || '').trim();
  if (!partial || input.description !== undefined) out.description = input.description?.trim() || null;
  if (!partial || input.capacity !== undefined) out.capacity = input.capacity ? Number(input.capacity) : null;
  if (!partial || input.icon !== undefined) out.icon = input.icon || null;
  return out;
}
