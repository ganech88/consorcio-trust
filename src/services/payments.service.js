import { supabase } from '../lib/supabase';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function uploadAttachment(file, folder = 'general') {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Tipo de archivo no permitido. Solo JPG, PNG, WebP o PDF.');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('El archivo supera el límite de 10 MB.');
  }
  const ext = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(ext) ? ext : 'bin';
  const fileName = `${folder}/${crypto.randomUUID()}.${safeExt}`;

  const { error: uploadError } = await supabase.storage
    .from('comprobantes')
    .upload(fileName, file, { contentType: file.type });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('comprobantes')
    .getPublicUrl(fileName);

  return publicUrl;
}

export async function uploadPaymentProof(file) {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Tipo de archivo no permitido. Solo JPG, PNG, WebP o PDF.');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('El archivo supera el límite de 10 MB.');
  }

  const ext = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(ext) ? ext : 'bin';
  const fileName = `${crypto.randomUUID()}.${safeExt}`;

  const { error: uploadError } = await supabase.storage
    .from('comprobantes')
    .upload(fileName, file, {
      contentType: file.type,
      metadata: { originalName: file.name },
    });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('comprobantes')
    .getPublicUrl(fileName);

  return { fileName, publicUrl };
}

export async function savePaymentRecord({ amount, proofUrl, userId, unitId }) {
  const { data, error } = await supabase
    .from('payments')
    .insert([{
      amount,
      status: 'pending',
      proof_url: proofUrl,
      user_id: userId,
      unit_id: unitId,
    }])
    .select();

  if (error) throw error;
  return data?.[0];
}

export async function fetchPayments(userId) {
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, status, proof_url, created_at, unit_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  return data || [];
}
