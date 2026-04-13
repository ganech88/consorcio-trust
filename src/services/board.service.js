import { supabase } from '../lib/supabase';

export async function fetchBoardPosts(consortiumId) {
  let query = supabase
    .from('board_posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (consortiumId) query = query.eq('consortium_id', consortiumId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createBoardPost({ consortiumId, userId, title, body, category }) {
  const { data, error } = await supabase
    .from('board_posts')
    .insert([{
      consortium_id: consortiumId || null,
      user_id: userId,
      title,
      body: body || null,
      category,
    }])
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBoardPost(id) {
  const { error } = await supabase.from('board_posts').delete().eq('id', id);
  if (error) throw error;
}

export async function reactBoardPost(id) {
  const { error } = await supabase.rpc('increment_board_reactions', { post_id: id });
  if (error) {
    const { data: current } = await supabase
      .from('board_posts').select('reactions_count').eq('id', id).single();
    const { error: updateError } = await supabase
      .from('board_posts')
      .update({ reactions_count: (current?.reactions_count || 0) + 1 })
      .eq('id', id);
    if (updateError) throw updateError;
  }
}
