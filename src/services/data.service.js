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

export async function fetchExpenseItems() {
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

export async function createExpenseItem({ category, amount, consortiumId }) {
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

export async function fetchAnnouncements(consortiumId) {
  let query = supabase
    .from('announcements')
    .select('*')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (consortiumId) query = query.eq('consortium_id', consortiumId);

  const { data, error } = await query;
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

// ─── Documentos del consorcio (biblioteca admin → DocsView) ───────────────────

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

// ─── Documentos de residentes (aprobaciones) ──────────────────────────────────

export const fetchDocuments = async (consortiumId, userId, isAdmin = false) => {
  let query = supabase
    .from('documents')
    .select(isAdmin ? '*, profiles(full_name, unit_id)' : '*')
    .eq('consortium_id', consortiumId)
    .order('created_at', { ascending: false });
  if (!isAdmin) query = query.eq('user_id', userId);
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
  let query = supabase
    .from('expense_periods')
    .select('*')
    .order('period', { ascending: false });

  if (consortiumId) query = query.eq('consortium_id', consortiumId);

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

// ─── Eventos / Calendario ─────────────────────────────────────────────────────

export async function fetchEvents(consortiumId) {
  let query = supabase
    .from('events')
    .select('*')
    .order('start_date', { ascending: true });

  if (consortiumId) query = query.eq('consortium_id', consortiumId);

  const { data, error } = await query;
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
  let query = supabase
    .from('expenses_log')
    .select('*')
    .order('date', { ascending: false });

  if (consortiumId) query = query.eq('consortium_id', consortiumId);

  const { data, error } = await query;
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
  let query = supabase
    .from('expenses_log')
    .select('date, amount, category')
    .order('date', { ascending: true });

  if (consortiumId) query = query.eq('consortium_id', consortiumId);

  const { data, error } = await query;
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

// ─── Paquetería (nueva tabla 013) ──────────────────────────────────────────────

export async function fetchUserPackages(userId, isAdmin = false) {
  let query = supabase
    .from('packages')
    .select('*')
    .order('created_at', { ascending: false });

  if (!isAdmin) {
    query = query.eq('unit_user_id', userId);
  }

  const { data, error } = await query;
  if (error) { console.warn('packages (013):', error.message); return []; }
  return data || [];
}

export async function createPackage({ consortiumId, carrier, description, loggedBy }) {
  const { data, error } = await supabase
    .from('packages')
    .insert([{
      consortium_id: consortiumId || null,
      carrier: carrier || null,
      description,
      logged_by: loggedBy,
      status: 'pending',
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function collectPackage(id) {
  const { data, error } = await supabase
    .from('packages')
    .update({ status: 'collected', collected_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Tablón (board_posts) ──────────────────────────────────────────────────────

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
    // Fallback: manual increment
    const { data: current } = await supabase
      .from('board_posts').select('reactions_count').eq('id', id).single();
    const { error: updateError } = await supabase
      .from('board_posts')
      .update({ reactions_count: (current?.reactions_count || 0) + 1 })
      .eq('id', id);
    if (updateError) throw updateError;
  }
}

// ─── Mantenimiento ────────────────────────────────────────────────────────────

const RECURRENCE_DAYS = {
  weekly:    7,
  monthly:   30,
  quarterly: 90,
  biannual:  180,
  annual:    365,
};

export async function fetchMaintenanceTasks(consortiumId) {
  let query = supabase
    .from('maintenance_tasks')
    .select('*')
    .order('next_due', { ascending: true });

  if (consortiumId) query = query.eq('consortium_id', consortiumId);

  const { data, error } = await query;
  if (error) { console.warn('maintenance_tasks:', error.message); return []; }
  return data || [];
}

export async function createMaintenanceTask({ consortiumId, name, category, recurrence, nextDue, estimatedCost, notes, createdBy }) {
  const { data, error } = await supabase
    .from('maintenance_tasks')
    .insert([{
      consortium_id: consortiumId || null,
      name,
      category: category || null,
      recurrence: recurrence || 'monthly',
      next_due: nextDue || null,
      estimated_cost: estimatedCost || null,
      notes: notes || null,
      created_by: createdBy,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function completeMaintenanceTask(id) {
  const today = new Date().toISOString().split('T')[0];

  // First fetch to get recurrence
  const { data: task, error: fetchErr } = await supabase
    .from('maintenance_tasks')
    .select('recurrence')
    .eq('id', id)
    .single();

  if (fetchErr) throw fetchErr;

  // Compute next due date
  const days = RECURRENCE_DAYS[task?.recurrence] || 30;
  const nextDue = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('maintenance_tasks')
    .update({ last_completed: today, next_due: nextDue })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Visitantes pre-autorizados ───────────────────────────────────────────────

export async function fetchAuthorizedVisitors(userId) {
  let query = supabase
    .from('authorized_visitors')
    .select('*')
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) { console.warn('authorized_visitors:', error.message); return []; }
  return data || [];
}

export async function createAuthorizedVisitor({ consortiumId, userId, visitorName, visitorType, validFrom, validUntil, timeFrom, timeTo, note }) {
  const { data, error } = await supabase
    .from('authorized_visitors')
    .insert([{
      consortium_id: consortiumId || null,
      user_id: userId,
      visitor_name: visitorName,
      visitor_type: visitorType || 'Visita',
      valid_from: validFrom || null,
      valid_until: validUntil || null,
      time_from: timeFrom || null,
      time_to: timeTo || null,
      note: note || null,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function checkInVisitor(id, checkedInBy) {
  const { data, error } = await supabase
    .from('authorized_visitors')
    .update({ checked_in_at: new Date().toISOString(), checked_in_by: checkedInBy })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Consorcios ───────────────────────────────────────────────────────────────

export async function fetchConsortium(consortiumId) {
  if (!consortiumId) return null;
  const { data, error } = await supabase
    .from('consortia')
    .select('*')
    .eq('id', consortiumId)
    .single();
  if (error) { console.warn('fetchConsortium:', error.message); return null; }
  return data;
}

export async function updateConsortium(consortiumId, updates) {
  const { data, error } = await supabase
    .from('consortia')
    .update(updates)
    .eq('id', consortiumId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchConsortiumMembers(consortiumId) {
  if (!consortiumId) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, unit_id, role')
    .eq('consortium_id', consortiumId)
    .order('unit_id');
  if (error) { console.warn('fetchConsortiumMembers:', error.message); return []; }
  return data || [];
}

export async function joinConsortiumByCode(inviteCode, userId) {
  const { data: consortium, error: lookupError } = await supabase
    .from('consortia')
    .select('id, name')
    .eq('invite_code', inviteCode.trim())
    .single();

  if (lookupError || !consortium) {
    throw new Error('Código de invitación inválido. Verificá el código e intentá de nuevo.');
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ consortium_id: consortium.id })
    .eq('id', userId);

  if (updateError) throw updateError;
  return consortium;
}

// ─── Admin: perfiles ───────────────────────────────────────────────────────────

export async function fetchAllProfiles(consortiumId) {
  if (!consortiumId) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, unit_id, role, created_at')
    .eq('consortium_id', consortiumId)
    .order('unit_id');
  if (error) { console.warn('fetchAllProfiles:', error.message); return []; }
  return data || [];
}

export async function updateProfileRole(profileId, role) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', profileId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function regenerateInviteCode(consortiumId) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  const { data, error } = await supabase
    .from('consortia')
    .update({ invite_code: code })
    .eq('id', consortiumId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createConsortiumForUser(name, address, city, userId) {
  const { data: consortium, error: createError } = await supabase
    .from('consortia')
    .insert([{ name, address: address || null, city: city || null }])
    .select()
    .single();

  if (createError) throw createError;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ consortium_id: consortium.id, role: 'admin' })
    .eq('id', userId);

  if (updateError) throw updateError;
  return consortium;
}

// ─── Expenses (nueva tabla 019) ────────────────────────────────────────────────

export const fetchExpenses = async (consortiumId) => {
  const { data, error } = await supabase
    .from('expenses')
    .select('*, expense_payments(*)')
    .eq('consortium_id', consortiumId)
    .order('due_date', { ascending: false });
  if (error) throw error;
  return data;
};

export const createExpense = async (consortiumId, userId, expense) => {
  const { data, error } = await supabase
    .from('expenses')
    .insert({ ...expense, consortium_id: consortiumId, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateExpense = async (expenseId, updates) => {
  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', expenseId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteExpense = async (expenseId) => {
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
  if (error) throw error;
};

export const createExpensePayment = async (expenseId, userId, payment) => {
  const { data, error } = await supabase
    .from('expense_payments')
    .insert({ ...payment, expense_id: expenseId, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updatePaymentStatus = async (paymentId, status, notes) => {
  const { data, error } = await supabase
    .from('expense_payments')
    .update({ status, notes })
    .eq('id', paymentId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ─── Multas ───────────────────────────────────────────────────────────────────

export async function fetchFines(consortiumId) {
  const { data, error } = await supabase
    .from('fines')
    .select('*, profiles(full_name, unit_id)')
    .eq('consortium_id', consortiumId)
    .order('created_at', { ascending: false });

  if (error) { console.warn('fines:', error.message); return []; }
  return data || [];
}

export async function fetchUnitFines(unitId, consortiumId) {
  const { data, error } = await supabase
    .from('fines')
    .select('*')
    .eq('unit_id', unitId)
    .eq('consortium_id', consortiumId)
    .eq('status', 'active')
    .order('fine_date', { ascending: false });

  if (error) { console.warn('fetchUnitFines:', error.message); return []; }
  return data || [];
}

export async function fetchMyFines(userId) {
  const { data, error } = await supabase
    .from('fines')
    .select('*')
    .eq('user_id', userId)
    .order('fine_date', { ascending: false });

  if (error) { console.warn('fetchMyFines:', error.message); return []; }
  return data || [];
}

export async function createFine({ consortiumId, unitId, userId, amount, reason, period, notes, appliedBy }) {
  const { data, error } = await supabase
    .from('fines')
    .insert([{
      consortium_id: consortiumId,
      unit_id: unitId,
      user_id: userId || null,
      amount: Number(amount),
      reason,
      period: period || null,
      notes: notes || null,
      applied_by: appliedBy,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateFineStatus(fineId, status) {
  const { data, error } = await supabase
    .from('fines')
    .update({ status })
    .eq('id', fineId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteFine(fineId) {
  const { error } = await supabase.from('fines').delete().eq('id', fineId);
  if (error) throw error;
}

export async function fetchFinesSummaryByPeriod(consortiumId, period) {
  const { data, error } = await supabase
    .from('fines')
    .select('amount')
    .eq('consortium_id', consortiumId)
    .eq('period', period)
    .eq('status', 'active');

  if (error) { console.warn('fetchFinesSummaryByPeriod:', error.message); return 0; }
  return (data || []).reduce((sum, f) => sum + Number(f.amount), 0);
}

// ─── Tracking de lecturas de comunicados ──────────────────────────────────────

export async function markAnnouncementRead(announcementId, userId) {
  const { error } = await supabase
    .from('announcement_reads')
    .upsert(
      { announcement_id: announcementId, user_id: userId },
      { onConflict: 'announcement_id,user_id' }
    );

  if (error) console.warn('markAnnouncementRead:', error.message);
}

export async function fetchMyAnnouncementReads(userId) {
  const { data, error } = await supabase
    .from('announcement_reads')
    .select('announcement_id')
    .eq('user_id', userId);

  if (error) { console.warn('fetchMyAnnouncementReads:', error.message); return []; }
  return (data || []).map(r => r.announcement_id);
}

export async function fetchAnnouncementReadCount(announcementId) {
  const { count, error } = await supabase
    .from('announcement_reads')
    .select('id', { count: 'exact', head: true })
    .eq('announcement_id', announcementId);

  if (error) { console.warn('fetchAnnouncementReadCount:', error.message); return 0; }
  return count || 0;
}

// ─── Proveedores ──────────────────────────────────────────────────────────────

export async function fetchSuppliers(consortiumId) {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('consortium_id', consortiumId)
    .eq('active', true)
    .order('name');
  if (error) { console.warn('fetchSuppliers:', error.message); return []; }
  return data || [];
}

export async function createSupplier(consortiumId, supplier) {
  const { data, error } = await supabase
    .from('suppliers')
    .insert([{ ...supplier, consortium_id: consortiumId }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSupplier(supplierId, updates) {
  const { data, error } = await supabase
    .from('suppliers')
    .update(updates)
    .eq('id', supplierId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSupplier(supplierId) {
  const { error } = await supabase
    .from('suppliers')
    .update({ active: false })
    .eq('id', supplierId);
  if (error) throw error;
}

// ─── Órdenes de pago ─────────────────────────────────────────────────────────

export async function fetchPaymentOrders(consortiumId, status = null) {
  let query = supabase
    .from('payment_orders')
    .select('*, suppliers(name, category, cuit)')
    .eq('consortium_id', consortiumId)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) { console.warn('fetchPaymentOrders:', error.message); return []; }
  return data || [];
}

export async function createPaymentOrder(consortiumId, userId, order) {
  const { data, error } = await supabase
    .from('payment_orders')
    .insert([{ ...order, consortium_id: consortiumId, created_by: userId }])
    .select('*, suppliers(name, category)')
    .single();
  if (error) throw error;
  return data;
}

export async function updatePaymentOrderStatus(orderId, status, userId = null) {
  const updates = { status };
  if (status === 'paid') {
    updates.paid_at = new Date().toISOString();
    if (userId) updates.paid_by = userId;
  }
  const { data, error } = await supabase
    .from('payment_orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePaymentOrder(orderId) {
  const { error } = await supabase.from('payment_orders').delete().eq('id', orderId);
  if (error) throw error;
}

// ─── Recordatorios de deuda ───────────────────────────────────────────────────

export async function updateReminderSettings(consortiumId, settings) {
  const { data, error } = await supabase
    .from('consortia')
    .update(settings)
    .eq('id', consortiumId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchRemindersLog(consortiumId) {
  const { data, error } = await supabase
    .from('debt_reminders_log')
    .select('*, profiles(full_name, unit_id)')
    .eq('consortium_id', consortiumId)
    .order('sent_at', { ascending: false })
    .limit(50);
  if (error) { console.warn('fetchRemindersLog:', error.message); return []; }
  return data || [];
}

// ─── MercadoPago ──────────────────────────────────────────────────────────────

export async function fetchMpConfig(consortiumId) {
  const { data, error } = await supabase
    .from('mp_config')
    .select('id, public_key, enabled')
    .eq('consortium_id', consortiumId)
    .maybeSingle();
  if (error) { console.warn('fetchMpConfig:', error.message); return null; }
  return data;
}

export async function saveMpConfig(consortiumId, config) {
  const { data, error } = await supabase
    .from('mp_config')
    .upsert({ ...config, consortium_id: consortiumId, updated_at: new Date().toISOString() }, { onConflict: 'consortium_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createMpPreference(expenseId, userId, amount, consortiumId) {
  const { data, error } = await supabase.functions.invoke('mercadopago-create-preference', {
    body: { expenseId, userId, amount, consortiumId },
  });
  if (error) throw error;
  return data;
}
