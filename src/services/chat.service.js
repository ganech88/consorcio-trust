import { supabase } from '../lib/supabase';

export async function fetchOrCreateConversation(userId, consortiumId) {
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    // Si el usuario cambió de consorcio, re-vinculamos la conversación al
    // consorcio actual para que el admin correcto la vea en su bandeja.
    if (consortiumId && existing.consortium_id !== consortiumId) {
      const { data: updated, error } = await supabase
        .from('conversations')
        .update({ consortium_id: consortiumId })
        .eq('id', existing.id)
        .select()
        .maybeSingle();
      if (!error && updated) return updated;
      return { ...existing, consortium_id: consortiumId };
    }
    return existing;
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert([{ user_id: userId, consortium_id: consortiumId || null }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchAllConversations(consortiumId) {
  // Hint explícito del FK para desambiguar el embed de profiles.
  let query = supabase
    .from('conversations')
    .select('*, profiles!conversations_user_id_profiles_fkey(full_name, unit_id)')
    .order('last_message_at', { ascending: false });

  if (consortiumId) query = query.eq('consortium_id', consortiumId);

  const { data, error } = await query;
  if (error) { console.warn('conversations:', error.message); return []; }
  return data || [];
}

export async function fetchMessages(conversationId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) { console.warn('messages:', error.message); return []; }
  return data || [];
}

export async function sendMessage({ conversationId, senderId, content }) {
  const { data, error } = await supabase
    .from('messages')
    .insert([{ conversation_id: conversationId, sender_id: senderId, content }])
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data;
}

export async function markMessagesRead(conversationId, userId) {
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .is('read_at', null);

  if (error) console.warn('markMessagesRead:', error.message);
}

export async function countUnreadMessages(userId) {
  const { data: conv } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!conv) return 0;

  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conv.id)
    .neq('sender_id', userId)
    .is('read_at', null);

  if (error) return 0;
  return count || 0;
}

// No-leídos por conversación (para la bandeja del admin).
export async function fetchUnreadByConversation(conversationIds, userId) {
  if (!conversationIds?.length) return {};
  const { data, error } = await supabase
    .from('messages')
    .select('conversation_id')
    .in('conversation_id', conversationIds)
    .neq('sender_id', userId)
    .is('read_at', null);

  if (error) { console.warn('fetchUnreadByConversation:', error.message); return {}; }
  const map = {};
  (data || []).forEach(m => { map[m.conversation_id] = (map[m.conversation_id] || 0) + 1; });
  return map;
}

// Total de no-leídos para el badge global: residente = su conversación;
// admin = suma de todas las conversaciones del consorcio.
export async function fetchUnreadChatCount({ userId, isAdmin, consortiumId }) {
  if (!userId) return 0;
  if (!isAdmin) return countUnreadMessages(userId);
  if (!consortiumId) return 0;

  const { data: convs } = await supabase
    .from('conversations')
    .select('id')
    .eq('consortium_id', consortiumId);

  const ids = (convs || []).map(c => c.id);
  if (!ids.length) return 0;

  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .in('conversation_id', ids)
    .neq('sender_id', userId)
    .is('read_at', null);

  if (error) return 0;
  return count || 0;
}
