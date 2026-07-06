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

// Schema real (migración 019): title, file_name (path en storage), file_url
// (legacy), user_id (uploader, NOT NULL), doc_type, status, consortium_id.
export async function uploadConsortiumDocument(file, title, docType, consortiumId, uploadedBy) {
  if (file.type !== 'application/pdf') {
    throw new Error('Solo se permiten archivos PDF.');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('El archivo supera el límite de 10 MB.');
  }

  const path = `${consortiumId || 'general'}/${crypto.randomUUID()}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(path, file, { contentType: 'application/pdf' });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('documents')
    .insert([{
      title,
      file_name: path,
      file_url: null, // bucket privado: se resuelve con signed URL al abrir
      doc_type: docType || 'general',
      status: 'approved', // subido por la administración, no requiere revisión
      consortium_id: consortiumId,
      user_id: uploadedBy,
    }])
    .select()
    .single();

  if (error) {
    // No dejar el archivo huérfano en storage si falló el insert
    await supabase.storage.from('documents').remove([path]);
    throw error;
  }
  return data;
}

// Bucket `documents` privado (migración 067): siempre abrir con signed URL.
export async function getSignedDocumentUrl(pathOrUrl, expiresIn = 3600) {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl; // compat con URLs viejas
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(pathOrUrl, expiresIn);
  if (error) { console.warn('signed url:', error.message); return null; }
  return data?.signedUrl ?? null;
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
