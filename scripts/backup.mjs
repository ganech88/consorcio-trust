#!/usr/bin/env node
/**
 * Backup de la base de ConsorcioTrust (Supabase free tier no tiene PITR).
 * Exporta todas las tablas de negocio + los usuarios de Auth a un JSON.
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/backup.mjs
 *
 * Genera: backups/consorciotrust-backup-<timestamp>.json
 *
 * El SERVICE_ROLE_KEY saltea RLS (lee todo). NUNCA lo subas al repo:
 * usalo como variable de entorno / secret. El archivo de backup contiene
 * datos personales: guardalo en un lugar privado.
 */
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.');
  process.exit(1);
}

// Tablas de negocio. mp_config se excluye a proposito (contiene el access_token
// de MercadoPago; es un secreto y se recarga a mano). Actualizar si se agregan tablas.
const TABLES = [
  'admin_consortia', 'amenities', 'announcement_reads', 'announcements',
  'authorized_visitors', 'board_posts', 'bookings', 'budgets', 'claims',
  'consortia', 'contacts', 'conversations', 'debt_reminders_log', 'documents',
  'events', 'expense_items', 'expense_payments', 'expense_period_items',
  'expense_periods', 'expenses', 'expenses_log', 'expenses_summary', 'fines',
  'insurance_policies', 'maintenance_tasks', 'messages', 'packages',
  'payment_orders', 'payments', 'poll_votes', 'polls', 'profiles',
  'reservations', 'suppliers', 'unidentified_payments', 'units', 'visitors',
];

const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

async function dumpTable(name) {
  const all = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from(name).select('*').range(from, from + pageSize - 1);
    if (error) { console.warn(`  ! ${name}: ${error.message}`); break; }
    all.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return all;
}

async function dumpAuthUsers() {
  const all = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) { console.warn(`  ! auth.users: ${error.message}`); break; }
    const users = data?.users || [];
    // Guardamos solo lo necesario para re-crear el usuario (sin password hashes).
    all.push(...users.map((u) => ({
      id: u.id, email: u.email, phone: u.phone,
      created_at: u.created_at, email_confirmed_at: u.email_confirmed_at,
      user_metadata: u.user_metadata, app_metadata: u.app_metadata,
    })));
    if (users.length < 1000) break;
  }
  return all;
}

async function main() {
  const started = new Date();
  console.log(`Backup ConsorcioTrust — ${started.toISOString()}`);
  const out = { generatedAt: started.toISOString(), project: URL, tables: {}, authUsers: [] };

  for (const t of TABLES) {
    const rows = await dumpTable(t);
    out.tables[t] = rows;
    console.log(`  ✓ ${t}: ${rows.length} filas`);
  }

  out.authUsers = await dumpAuthUsers();
  console.log(`  ✓ auth.users: ${out.authUsers.length} usuarios`);

  mkdirSync('backups', { recursive: true });
  const stamp = started.toISOString().replace(/[:.]/g, '-');
  const file = join('backups', `consorciotrust-backup-${stamp}.json`);
  writeFileSync(file, JSON.stringify(out, null, 2));
  const totalRows = Object.values(out.tables).reduce((s, r) => s + r.length, 0);
  console.log(`\nListo: ${file}\n${totalRows} filas + ${out.authUsers.length} usuarios.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
