import { supabase } from '../lib/supabase';

export async function fetchPolls(consortiumId) {
  let query = supabase
    .from('polls')
    .select('*')
    .order('ends_at', { ascending: false });

  if (consortiumId) query = query.eq('consortium_id', consortiumId);

  const { data, error } = await query;
  if (error) { console.warn('polls:', error.message); return []; }
  return data || [];
}

export async function createPoll({ title, description, options, endsAt, consortiumId, createdBy }) {
  const { data, error } = await supabase
    .from('polls')
    .insert([{
      title,
      description: description || null,
      options,
      ends_at: endsAt,
      consortium_id: consortiumId || null,
      created_by: createdBy,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchPollVotes(pollId) {
  const { data, error } = await supabase
    .from('poll_votes')
    .select('*')
    .eq('poll_id', pollId);

  if (error) { console.warn('poll_votes:', error.message); return []; }
  return data || [];
}

export async function fetchUserVote(pollId, userId) {
  const { data, error } = await supabase
    .from('poll_votes')
    .select('*')
    .eq('poll_id', pollId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function submitVote({ pollId, userId, optionIndex }) {
  const { data, error } = await supabase
    .from('poll_votes')
    .insert([{ poll_id: pollId, user_id: userId, option_index: optionIndex }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePoll(id) {
  const { error } = await supabase.from('polls').delete().eq('id', id);
  if (error) throw error;
}
