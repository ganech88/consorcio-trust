import { supabase } from '../lib/supabase';
import { paginateQuery } from '../lib/pagination';
import { fetchUnitNames } from './units.service';
import type { Database } from '../lib/database.types';

type ClaimUpdate = Database['public']['Tables']['claims']['Update'];

export async function fetchClaims(consortiumId?: string) {
  let query = supabase
    .from('claims')
    .select('*')
    .order('created_at', { ascending: false });

  // Defensa en profundidad: acotar por consorcio ademas de RLS
  if (consortiumId) query = query.eq('consortium_id', consortiumId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createClaim(params: {
  title: string;
  category?: string | null;
  description?: string | null;
  consortiumId: string;
  userId: string;
}) {
  const { title, category, description, consortiumId, userId } = params;
  const { data, error } = await supabase
    .from('claims')
    .insert([{
      title,
      category: category || null,
      description: description || null,
      status: 'open',
      consortium_id: consortiumId,
      user_id: userId,
    }])
    .select();

  if (error) throw error;
  // No fabricar entidades en el cliente: si el insert no devuelve fila, es un fallo.
  if (!data?.[0]) throw new Error('No se pudo crear el reclamo (sin fila devuelta).');
  return data[0];
}

// Reclamos del consorcio ACTIVO para el panel del administrador. Se filtra por
// consorcio además de RLS: un super admin (o un admin con varios edificios) veía
// mezclados los reclamos de todos. Agrega `profiles.unit_label` ("1A").
export async function fetchAllClaims(
  { consortiumId, page, pageSize }: { consortiumId?: string | null; page?: number; pageSize?: number } = {},
) {
  if (!consortiumId) return page != null ? { data: [], total: 0, page: 0, pageSize: pageSize ?? 20, totalPages: 0 } : [];
  const query = supabase
    .from('claims')
    .select('*, profiles(full_name, unit_id)', { count: 'exact' })
    .eq('consortium_id', consortiumId)
    .order('created_at', { ascending: false });

  if (page != null) {
    const result: any = await paginateQuery(query, page, pageSize);
    result.data = await withUnitLabels(result.data || []);
    return result;
  }

  const { data, error } = await query;
  if (error) throw error;
  return withUnitLabels(data || []);
}

async function withUnitLabels(rows: any[]): Promise<any[]> {
  const names: Record<string, string> = await fetchUnitNames(rows.map(r => r.profiles?.unit_id));
  return rows.map(r => (r.profiles
    ? { ...r, profiles: { ...r.profiles, unit_label: names[r.profiles.unit_id] ?? null } }
    : r));
}

export async function updateClaimStatus(
  claimId: string,
  status: string,
  adminNote?: string,
  adminUserId?: string,
) {
  const updates: ClaimUpdate = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (adminNote !== undefined) updates.admin_note = adminNote;
  if (adminUserId) updates.responded_by = adminUserId;

  const { data, error } = await supabase
    .from('claims')
    .update(updates)
    .eq('id', claimId)
    .select();

  if (error) throw error;
  return data?.[0];
}
