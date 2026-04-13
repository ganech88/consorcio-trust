import { supabase } from '../lib/supabase';

export async function fetchContacts() {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .order('category')
    .order('sort_order');

  if (error) {
    console.warn('contacts table not available:', error.message);
    return [];
  }
  return data || [];
}
