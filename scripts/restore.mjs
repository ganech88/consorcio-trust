#!/usr/bin/env node
/**
 * Restore de EMERGENCIA desde un backup JSON (generado por backup.mjs).
 * Re-crea usuarios de Auth y hace upsert de todas las tablas en orden de FKs.
 *
 * USALO CON CUIDADO: sobrescribe filas por id (upsert). Pensado para
 * recuperar una base vacia/corrupta, no para "mergear".
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... RESTORE_CONFIRM=YES \
 *     node scripts/restore.mjs backups/consorciotrust-backup-XXXX.json
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const file = process.argv[2];
if (!URL || !KEY) { console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.'); process.exit(1); }
if (!file) { console.error('Pasá el archivo de backup: node scripts/restore.mjs <backup.json>'); process.exit(1); }
if (process.env.RESTORE_CONFIRM !== 'YES') {
  console.error('Seguridad: definí RESTORE_CONFIRM=YES para confirmar que querés sobrescribir datos.');
  process.exit(1);
}

const supabase = createClient(URL, KEY, { auth: { persistSession: false } });
const backup = JSON.parse(readFileSync(file, 'utf8'));

// Orden por dependencias de claves foraneas (padres primero).
const ORDER = [
  'consortia', 'units', 'profiles', 'admin_consortia', 'amenities', 'suppliers',
  'expense_periods', 'expenses', 'expenses_log', 'expenses_summary', 'expense_items',
  'expense_period_items', 'expense_payments', 'payment_orders', 'payments', 'fines',
  'insurance_policies', 'budgets', 'unidentified_payments', 'maintenance_tasks',
  'announcements', 'announcement_reads', 'board_posts', 'claims', 'contacts',
  'conversations', 'messages', 'documents', 'events', 'polls', 'poll_votes',
  'packages', 'reservations', 'bookings', 'authorized_visitors', 'visitors',
  'debt_reminders_log',
];

async function restoreAuthUsers() {
  const users = backup.authUsers || [];
  let ok = 0;
  for (const u of users) {
    if (!u.email && !u.phone) continue;
    const { error } = await supabase.auth.admin.createUser({
      id: u.id, email: u.email, phone: u.phone, email_confirm: true,
      user_metadata: u.user_metadata, app_metadata: u.app_metadata,
    });
    if (error && !/already.*registered|exists/i.test(error.message)) {
      console.warn(`  ! auth ${u.email}: ${error.message}`);
    } else ok++;
  }
  console.log(`  ✓ auth.users: ${ok}/${users.length} (sin password; pedir reset)`);
}

async function main() {
  console.log(`Restore desde ${file} → ${URL}`);
  await restoreAuthUsers();

  const names = Object.keys(backup.tables || {});
  const ordered = [...ORDER.filter((t) => names.includes(t)), ...names.filter((t) => !ORDER.includes(t))];

  for (const t of ordered) {
    const rows = backup.tables[t] || [];
    if (rows.length === 0) { console.log(`  - ${t}: vacio`); continue; }
    // upsert en lotes de 500
    let done = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await supabase.from(t).upsert(chunk, { onConflict: 'id' });
      if (error) { console.warn(`  ! ${t}: ${error.message}`); break; }
      done += chunk.length;
    }
    console.log(`  ✓ ${t}: ${done}/${rows.length}`);
  }
  console.log('\nRestore finalizado. Los usuarios restaurados no tienen contraseña: usá "Olvidé mi contraseña".');
}

main().catch((e) => { console.error(e); process.exit(1); });
