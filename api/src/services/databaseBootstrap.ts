import { sql } from 'drizzle-orm';
import { db } from '../db';

/** Ejecuta una sentencia ignorando errores de columna/índice duplicado */
function getFullErrorMessage(error: any): string {
  const parts: string[] = [];
  let current = error;
  while (current) {
    if (current.message) parts.push(current.message);
    current = current.cause;
  }
  return parts.join(' | ');
}

async function safeRun(query: string) {
  try {
    await db.run(sql.raw(query));
  } catch (error: any) {
    const msg = getFullErrorMessage(error);
    if (msg.includes('duplicate column') || msg.includes('already exists')) {
      return; // La columna/índice ya existe, ignorar silenciosamente
    }
    throw error;
  }
}

export async function ensureDynamicTables() {
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS push_tokens (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id integer NOT NULL,
      token text NOT NULL UNIQUE,
      platform text,
      device_label text,
      created_at integer NOT NULL,
      updated_at integer NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS nudge_events (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      sender_user_id integer NOT NULL,
      target_user_id integer NOT NULL,
      challenge_id integer NOT NULL,
      created_at integer NOT NULL,
      FOREIGN KEY (sender_user_id) REFERENCES users(id),
      FOREIGN KEY (target_user_id) REFERENCES users(id),
      FOREIGN KEY (challenge_id) REFERENCES challenges(id)
    )
  `);

  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id)`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_nudge_events_daily ON nudge_events(sender_user_id, target_user_id, challenge_id, created_at)`);

  // --- Migraciones Fase 1 (fechas, share, reportes) — idempotentes ---

  await safeRun('ALTER TABLE challenges ADD COLUMN starts_at integer');
  await safeRun('ALTER TABLE challenges ADD COLUMN ends_at integer');
  await safeRun('ALTER TABLE challenges ADD COLUMN max_participants integer');
  await safeRun('ALTER TABLE user_challenges ADD COLUMN joined_at integer NOT NULL DEFAULT (unixepoch())');

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS shareable_events (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      challenge_id integer NOT NULL,
      day_number integer NOT NULL,
      image_url text NOT NULL,
      participant_count integer NOT NULL,
      created_at integer NOT NULL,
      FOREIGN KEY (challenge_id) REFERENCES challenges(id)
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS challenge_reports (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      challenge_id integer NOT NULL,
      reporter_user_id integer NOT NULL,
      reason text NOT NULL,
      details text,
      is_resolved integer DEFAULT 0,
      created_at integer NOT NULL,
      FOREIGN KEY (challenge_id) REFERENCES challenges(id),
      FOREIGN KEY (reporter_user_id) REFERENCES users(id)
    )
  `);
}
