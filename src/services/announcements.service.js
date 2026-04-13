import { supabase } from '../lib/supabase';

export async function fetchAnnouncements(consortiumId, { page, pageSize } = {}) {
  let query = supabase
    .from('announcements')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (consortiumId) query = query.eq('consortium_id', consortiumId);

  if (page != null) {
    const { paginateQuery } = await import('../lib/pagination');
    return paginateQuery(query, page, pageSize);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createAnnouncement({ title, body, type, pinned, consortiumId, createdBy }) {
  const row = {
    title,
    body,
    type: type || 'info',
    consortium_id: consortiumId || null,
    created_by: createdBy,
  };
  if (pinned !== undefined) row.pinned = pinned;

  const { data, error } = await supabase
    .from('announcements')
    .insert([row])
    .select();

  if (error) throw error;
  return data?.[0];
}

export async function deleteAnnouncement(id) {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function markAnnouncementRead(announcementId, userId) {
  const { error } = await supabase
    .from('announcement_reads')
    .upsert(
      { announcement_id: announcementId, user_id: userId },
      { onConflict: 'announcement_id,user_id' }
    );

  if (error) console.warn('markAnnouncementRead:', error.message);
}

export async function fetchMyAnnouncementReads(userId) {
  const { data, error } = await supabase
    .from('announcement_reads')
    .select('announcement_id')
    .eq('user_id', userId);

  if (error) { console.warn('fetchMyAnnouncementReads:', error.message); return []; }
  return (data || []).map(r => r.announcement_id);
}

export async function fetchAnnouncementReadCount(announcementId) {
  const { count, error } = await supabase
    .from('announcement_reads')
    .select('id', { count: 'exact', head: true })
    .eq('announcement_id', announcementId);

  if (error) { console.warn('fetchAnnouncementReadCount:', error.message); return 0; }
  return count || 0;
}
