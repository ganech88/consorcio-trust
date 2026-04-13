import { supabase } from '../lib/supabase';

export async function fetchReservations(userId) {
  const { data, error } = await supabase
    .from('reservations')
    .select('id, amenity_id, amenity_name, date, time_slot, status, created_at')
    .eq('user_id', userId)
    .order('date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createReservation({ amenityId, amenityName, date, timeSlot, userId, consortiumId }) {
  const { data, error } = await supabase
    .from('reservations')
    .insert([{
      amenity_id: amenityId,
      amenity_name: amenityName,
      date,
      time_slot: timeSlot,
      status: 'pending',
      user_id: userId,
      consortium_id: consortiumId,
    }])
    .select();

  if (error) throw error;
  return data?.[0];
}

export async function cancelReservation(reservationId) {
  const { error } = await supabase
    .from('reservations')
    .delete()
    .eq('id', reservationId);

  if (error) throw error;
}

export async function fetchAllReservations() {
  const { data: reservations, error } = await supabase
    .from('reservations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!reservations?.length) return [];

  const userIds = [...new Set(reservations.map(r => r.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, unit_id')
    .in('id', userIds);

  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

  return reservations.map(r => ({
    ...r,
    profiles: profileMap[r.user_id] || { full_name: 'Sin perfil', unit_id: null },
  }));
}

export async function updateReservationStatus(reservationId, status, adminNote) {
  const updates = { status };
  if (adminNote !== undefined) updates.admin_note = adminNote;

  const { data, error } = await supabase
    .from('reservations')
    .update(updates)
    .eq('id', reservationId)
    .select();

  if (error) throw error;
  return data?.[0];
}
