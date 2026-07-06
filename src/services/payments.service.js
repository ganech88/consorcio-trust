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

  // Bucket privado: guardamos el path; se accede con signed URLs.
  return fileName;
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

  return { fileName, path: fileName };
}

export async function getSignedComprobanteUrl(pathOrUrl, expiresIn = 3600) {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl; // compat con URLs viejas
  const { data, error } = await supabase.storage
    .from('comprobantes')
    .createSignedUrl(pathOrUrl, expiresIn);
  if (error) { console.warn('signed url:', error.message); return null; }
  return data?.signedUrl ?? null;
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

// --- Aprobacion de pagos informados (tabla payments) por el admin ---
// payments no tiene consortium_id; se scopea por la unidad. Devuelve los
// pendientes del consorcio con nombre del que pago y etiqueta de unidad.
export async function fetchInformedPayments(consortiumId) {
  if (!consortiumId) return [];
  const { data: units } = await supabase
    .from('units').select('id, name').eq('consortium_id', consortiumId);
  const unitIds = (units || []).map(u => u.id);
  if (!unitIds.length) return [];
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, status, proof_url, created_at, unit_id, user_id')
    .in('unit_id', unitIds)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const unitName = Object.fromEntries((units || []).map(u => [u.id, u.name]));
  const userIds = [...new Set((data || []).map(p => p.user_id))];
  let nameMap = {};
  if (userIds.length) {
    const { data: profs } = await supabase
      .from('profiles').select('id, full_name').in('id', userIds);
    nameMap = Object.fromEntries((profs || []).map(p => [p.id, p.full_name]));
  }
  return (data || []).map(p => ({
    ...p,
    unit_name: unitName[p.unit_id] || null,
    payer_name: nameMap[p.user_id] || 'Residente',
  }));
}

// Guard de estado: solo se decide sobre un pago que sigue 'pending'
// (evita dobles aprobaciones/rechazos en simultaneo).
export async function setInformedPaymentStatus(paymentId, status) {
  const { data, error } = await supabase
    .from('payments').update({ status }).eq('id', paymentId).eq('status', 'pending').select();
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('El pago ya fue procesado.');
  return data[0];
}
