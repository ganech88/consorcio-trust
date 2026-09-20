import { supabase } from '../lib/supabase';

export async function fetchMpConfig(consortiumId) {
  const { data, error } = await supabase
    .from('mp_config_safe')
    .select('id, public_key, enabled')
    .eq('consortium_id', consortiumId)
    .maybeSingle();
  if (error) { console.warn('fetchMpConfig:', error.message); return null; }
  return data;
}

export async function saveMpConfig(consortiumId, config) {
  const { data, error } = await supabase.functions.invoke('mp-config', {
    method: 'POST',
    body: { consortium_id: consortiumId, ...config },
  });
  if (error) throw error;
  return data;
}

// Pedir al servidor una preferencia de pago para MI expensa del período.
// El monto lo calcula la edge function (item + interés por mora): el cliente
// no manda importes. Devuelve { init_point, amount, interest }.
export async function createMpPreference(periodItemId) {
  const { data, error } = await supabase.functions.invoke('mercadopago-create-preference', {
    body: { periodItemId },
  });
  if (error) {
    let msg = error.message;
    try { const body = await error.context?.json?.(); if (body?.error) msg = body.error; } catch { /* ignore */ }
    throw new Error(msg || 'No se pudo iniciar el pago');
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
