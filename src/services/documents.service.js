import { supabase } from '../lib/supabase';

export async function fetchConsortiumDocuments(consortiumId) {
  let query = supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (consortiumId) query = query.eq('consortium_id', consortiumId);

  const { data, error } = await query;
  if (error) {
    console.warn('documents table not available:', error.message);
    return [];
  }
  return data || [];
}

export async function uploadConsortiumDocument(file, name, category, consortiumId, uploadedBy) {
  if (file.type !== 'application/pdf') {
    throw new Error('Solo se permiten archivos PDF.');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('El archivo supera el límite de 10 MB.');
  }

  const fileName = `${crypto.randomUUID()}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(fileName, file, { contentType: 'application/pdf' });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(fileName);

  const { data, error } = await supabase
    .from('documents')
    .insert([{
      name,
      category: category || 'general',
      file_path: fileName,
      file_url: publicUrl,
      consortium_id: consortiumId || null,
      uploaded_by: uploadedBy,
    }])
    .select();

  if (error) throw error;
  return data?.[0];
}

export async function deleteConsortiumDocument(id, filePath) {
  if (filePath) {
    await supabase.storage.from('documents').remove([filePath]);
  }
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw error;
}

export const fetchDocuments = async (consortiumId, userId, isAdmin = false, { page, pageSize } = {}) => {
  const selectStr = isAdmin ? '*, profiles!documents_user_id_fkey(full_name, unit_id)' : '*';
  let query = supabase
    .from('documents')
    .select(selectStr, { count: 'exact' })
    .eq('consortium_id', consortiumId)
    .order('created_at', { ascending: false });
  if (!isAdmin) query = query.eq('user_id', userId);

  if (page != null) {
    const { paginateQuery } = await import('../lib/pagination');
    return paginateQuery(query, page, pageSize);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const createDocument = async (consortiumId, userId, doc) => {
  const { data, error } = await supabase
    .from('documents')
    .insert({ ...doc, consortium_id: consortiumId, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateDocumentStatus = async (docId, status, adminNotes, reviewedBy) => {
  const { data, error } = await supabase
    .from('documents')
    .update({ status, admin_notes: adminNotes, reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() })
    .eq('id', docId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteDocument = async (docId) => {
  const { error } = await supabase.from('documents').delete().eq('id', docId);
  if (error) throw error;
};
