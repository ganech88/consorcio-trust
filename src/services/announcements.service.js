import { supabase } from '../lib/supabase';

// La tabla usa content/category/is_important; la UI usa body/type. Adaptamos.
const mapAnnouncement = (r) => ({
  ...r,
  body: r.content ?? r.body ?? '',
  type: r.is_important ? 'urgent' : (r.type || 'info'),
  audience: r.audience || 'all',
});

export async function fetchAnnouncements(consortiumId, { page, pageSize } = {}) {
  let query = supabase
    .from('announcements')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (consortiumId) query = query.eq('consortium_id', consortiumId);

  if (page != null) {
    const { paginateQuery } = await import('../lib/pagination');
    const res = await paginateQuery(query, page, pageSize);
    return { ...res, data: (res.data || []).map(mapAnnouncement) };
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapAnnouncement);
}

export async function createAnnouncement({ title, body, type, pinned, audience, consortiumId, createdBy }) {
  const row = {
    title,
    content: body,
    category: type || 'general',
    is_important: type === 'urgent',
    audience: audience || 'all',
    consortium_id: consortiumId || null,
    created_by: createdBy,
  };
  if (pinned !== undefined) row.pinned = pinned;

  const { data, error } = await supabase
    .from('announcements')
    .insert([row])
    .select();

  if (error) throw error;
  return data?.[0] ? mapAnnouncement(data[0]) : null;
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
