import { supabase } from '../lib/supabase';

// ─── Perfil ───────────────────────────────────────────────────────────────────

export async function fetchUserProfile(userId) {
  if (!userId) throw new Error('fetchUserProfile: userId requerido');

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, unit_id, consortium_id, role')
    .eq('id', userId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Reclamos (usuario) ───────────────────────────────────────────────────────

export async function fetchClaims() {
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createClaim({ title, category, description, consortiumId, userId }) {
  const { data, error } = await supabase
    .from('claims')
    .insert([{
      title,
      category: category || null,
      description: description || null,
      status: 'open',
      consortium_id: consortiumId,
      user_id: userId,
    }])
    .select();

  if (error) throw error;
  return data?.[0] ?? {
    title, category, description,
    status: 'open',
    created_at: new Date().toISOString(),
    id: crypto.randomUUID(),
  };
}

// ─── Reclamos (admin) ─────────────────────────────────────────────────────────

export async function fetchAllClaims() {
  const { data, error } = await supabase
    .from('claims')
    .select('*, profiles(full_name, unit_id)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateClaimStatus(claimId, status, adminNote, adminUserId) {
  const updates = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (adminNote !== undefined) updates.admin_note = adminNote;
  if (adminUserId) updates.responded_by = adminUserId;

  const { data, error } = await supabase
    .from('claims')
    .update(updates)
    .eq('id', claimId)
    .select();

  if (error) throw error;
  return data?.[0];
}

// ─── Expensas ─────────────────────────────────────────────────────────────────

export async function fetchExpenses() {
  const { data, error } = await supabase
    .from('expense_items')
    .select('category, amount');

  if (error) throw error;
  if (!data) return [];

  return data.map(e => ({ name: e.category, value: Number(e.amount) }));
}

export async function fetchExpenseSummary(unitId) {
  const { data, error } = await supabase
    .from('expenses_summary')
    .select('period, total_amount, due_date, status')
    .eq('unit_id', unitId)
    .order('period', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.warn('expenses_summary not available:', error.message);
    return null;
  }
  return data;
}

export async function createExpense({ category, amount, consortiumId }) {
  const { data, error } = await supabase
    .from('expense_items')
    .insert([{
      category,
      amount: Number(amount),
      consortium_id: consortiumId || null,
    }])
    .select();

  if (error) throw error;
  return data?.[0];
}

// ─── Pagos ────────────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export async function uploadPaymentProof(file) {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Tipo de archivo no permitido. Solo JPG, PNG, WebP o PDF.');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('El archivo supera el límite de 5 MB.');
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

// ─── Reservas (usuario) ───────────────────────────────────────────────────────

export async function fetchReservations(userId) {
  const { data, error } = await supabase
    .from('reservations')
    .select('id, amenity_id, amenity_name, date, time_slot, status, created_at')
    .eq('user_id', userId)
    .order('date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createReservation({ amenityId, amenityName, date, timeSlot, userId, consortiumId }) {
  const { data, error } = await supabase
    .from('reservations')
    .insert([{
      amenity_id: amenityId,
      amenity_name: amenityName,
      date,
      time_slot: timeSlot,
      status: 'pending',
      user_id: userId,
      consortium_id: consortiumId,
    }])
    .select();

  if (error) throw error;
  return data?.[0];
}

export async function cancelReservation(reservationId) {
  const { error } = await supabase
    .from('reservations')
    .delete()
    .eq('id', reservationId);

  if (error) throw error;
}

// ─── Reservas (admin) ─────────────────────────────────────────────────────────

export async function fetchAllReservations() {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, profiles(full_name, unit_id)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateReservationStatus(reservationId, status, adminNote) {
  const updates = { status };
  if (adminNote !== undefined) updates.admin_note = adminNote;

  const { data, error } = await supabase
    .from('reservations')
    .update(updates)
    .eq('id', reservationId)
    .select();

  if (error) throw error;
  return data?.[0];
}

// ─── Comunicados ──────────────────────────────────────────────────────────────

export async function fetchAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createAnnouncement({ title, body, type, pinned, consortiumId, createdBy }) {
  const { data, error } = await supabase
    .from('announcements')
    .insert([{
      title,
      body,
      type: type || 'info',
      pinned: pinned || false,
      consortium_id: consortiumId || null,
      created_by: createdBy,
    }])
    .select();

  if (error) throw error;
  return data?.[0];
}

export async function deleteAnnouncement(id) {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ─── Documentos ───────────────────────────────────────────────────────────────

export async function fetchDocuments() {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('documents table not available:', error.message);
    return [];
  }
  return data || [];
}

export async function uploadDocument(file, name, category, consortiumId, uploadedBy) {
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

export async function deleteDocument(id, filePath) {
  if (filePath) {
    await supabase.storage.from('documents').remove([filePath]);
  }
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw error;
}

// ─── Contactos ────────────────────────────────────────────────────────────────

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

// ─── Períodos de expensas ─────────────────────────────────────────────────────

export async function fetchExpensePeriods(consortiumId) {
  const query = supabase
    .from('expense_periods')
    .select('*')
    .order('period', { ascending: false });

  if (consortiumId) query.eq('consortium_id', consortiumId);

  const { data, error } = await query;
  if (error) { console.warn('expense_periods:', error.message); return []; }
  return data || [];
}

export async function createExpensePeriod({ period, totalAmount, dueDate, consortiumId, createdBy }) {
  const { data, error } = await supabase
    .from('expense_periods')
    .insert([{
      period,
      total_amount: Number(totalAmount),
      due_date: dueDate,
      consortium_id: consortiumId || null,
      created_by: createdBy,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchPeriodItems(periodId) {
  const { data, error } = await supabase
    .from('expense_period_items')
    .select('*, profiles(full_name, unit_id)')
    .eq('period_id', periodId)
    .order('unit_id');

  if (error) throw error;
  return data || [];
}

export async function fetchUserPeriodItems(userId) {
  const { data, error } = await supabase
    .from('expense_period_items')
    .select('*, expense_periods(period, due_date)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) { console.warn('expense_period_items:', error.message); return []; }
  return data || [];
}

export async function createPeriodItems(items) {
  const { data, error } = await supabase
    .from('expense_period_items')
    .insert(items)
    .select();

  if (error) throw error;
  return data || [];
}

export async function updatePeriodItemStatus(itemId, status) {
  const updates = { status };
  if (status === 'paid') updates.paid_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('expense_period_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Mensajes / Chat ──────────────────────────────────────────────────────────

export async function fetchOrCreateConversation(userId, consortiumId) {
  // Buscar conversación existente
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) return existing;

  // Crear nueva si no existe
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

  // Actualizar last_message_at en la conversación
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
  // Mensajes en conversaciones del usuario que no fueron enviados por él y no tienen read_at
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

// ─── Votaciones ────────────────────────────────────────────────────────────────

export async function fetchPolls(consortiumId) {
  const query = supabase
    .from('polls')
    .select('*')
    .order('ends_at', { ascending: false });

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

// ─── Eventos / Calendario ─────────────────────────────────────────────────────

export async function fetchEvents(consortiumId) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_date', { ascending: true });

  if (error) { console.warn('events:', error.message); return []; }
  return data || [];
}

export async function createEvent({ title, description, type, startDate, endDate, allDay, consortiumId, createdBy }) {
  const { data, error } = await supabase
    .from('events')
    .insert([{
      title,
      description: description || null,
      type: type || 'general',
      start_date: startDate,
      end_date: endDate || null,
      all_day: allDay ?? true,
      consortium_id: consortiumId || null,
      created_by: createdBy,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEvent(id, updates) {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEvent(id) {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}

// ─── Visitantes ────────────────────────────────────────────────────────────────

export async function fetchVisitors(userId) {
  const { data, error } = await supabase
    .from('visitors')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) { console.warn('visitors:', error.message); return []; }
  return data || [];
}

export async function addVisitor({ unitId, userId, name, docNumber, consortiumId }) {
  const { data, error } = await supabase
    .from('visitors')
    .insert([{
      unit_id: unitId,
      user_id: userId,
      name,
      doc_number: docNumber || null,
      consortium_id: consortiumId || null,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeVisitor(id) {
  const { error } = await supabase.from('visitors').delete().eq('id', id);
  if (error) throw error;
}

// ─── Encomiendas ──────────────────────────────────────────────────────────────

export async function fetchPackages(userId) {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .eq('user_id', userId)
    .order('received_at', { ascending: false });

  if (error) { console.warn('packages:', error.message); return []; }
  return data || [];
}

export async function fetchAllPackages() {
  const { data, error } = await supabase
    .from('packages')
    .select('*, profiles(full_name, unit_id)')
    .order('received_at', { ascending: false });

  if (error) { console.warn('packages:', error.message); return []; }
  return data || [];
}

export async function registerPackage({ unitId, userId, description, consortiumId }) {
  const { data, error } = await supabase
    .from('packages')
    .insert([{
      unit_id: unitId,
      user_id: userId,
      description,
      consortium_id: consortiumId || null,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deliverPackage(id) {
  const { data, error } = await supabase
    .from('packages')
    .update({ delivered_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Balance financiero ────────────────────────────────────────────────────────

export async function fetchExpensesLog(consortiumId) {
  const { data, error } = await supabase
    .from('expenses_log')
    .select('*')
    .order('date', { ascending: false });

  if (error) { console.warn('expenses_log:', error.message); return []; }
  return data || [];
}

export async function addExpenseLog({ description, category, amount, date, provider, consortiumId, createdBy }) {
  const { data, error } = await supabase
    .from('expenses_log')
    .insert([{
      description,
      category,
      amount: Number(amount),
      date,
      provider: provider || null,
      consortium_id: consortiumId || null,
      created_by: createdBy,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchMonthlyFinanceSummary(consortiumId) {
  const { data, error } = await supabase
    .from('expenses_log')
    .select('date, amount, category')
    .order('date', { ascending: true });

  if (error) { console.warn('expenses_log summary:', error.message); return []; }
  if (!data) return [];

  // Agrupar por mes
  const byMonth = {};
  data.forEach(row => {
    const month = row.date?.slice(0, 7); // 'YYYY-MM'
    if (!month) return;
    if (!byMonth[month]) byMonth[month] = 0;
    byMonth[month] += Number(row.amount);
  });

  return Object.entries(byMonth).map(([month, total]) => ({ month, total }));
}
