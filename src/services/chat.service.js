import { supabase } from '../lib/supabase';

export async function fetchOrCreateConversation(userId, consortiumId) {
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from('conversations')
    .insert([{ user_id: userId, consortium_id: consortiumId || null }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchAllConversations() {
  const { data, error } = await supabase
    .from('conversations')
    .select('*, profiles(full_name, unit_id)')
    .order('last_message_at', { ascending: false });

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
