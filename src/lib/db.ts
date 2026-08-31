import * as SQLite from "expo-sqlite";

export const DB_NAME = "manhaj.db";

let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (db) return db;
  db = SQLite.openDatabaseSync(DB_NAME);
  db.execSync(`
    CREATE TABLE IF NOT EXISTS downloads (
      episode_id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      scholar_name TEXT NOT NULL DEFAULT '',
      file_uri TEXT NOT NULL,
      downloaded_at TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS player_state (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS plays (
      id TEXT PRIMARY KEY NOT NULL,
      episode_id TEXT NOT NULL,
      source TEXT NOT NULL CHECK (source IN ('stream','offline')),
      played_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS plays_episode_idx ON plays(episode_id);
    CREATE INDEX IF NOT EXISTS plays_played_idx ON plays(played_at DESC);
  `);
  return db;
}

// generic kv helpers for settings + query persister
export function kvGet(key: string): string | null {
  const row = getDb().getFirstSync<{ value: string }>(`SELECT value FROM kv WHERE key = ?`, [key]);
  return row?.value ?? null;
}
export function kvSet(key: string, value: string): void {
  getDb().runSync(`INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)`, [key, value]);
}
export function kvDelete(key: string): void {
  getDb().runSync(`DELETE FROM kv WHERE key = ?`, [key]);
}

// local-only episode plays — no Supabase. For future analytics batch sync if needed.
export function logPlayLocal(episodeId: string, source: "stream" | "offline"): void {
  try {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    getDb().runSync(`INSERT INTO plays (id, episode_id, source, played_at) VALUES (?, ?, ?, ?)`, [id, episodeId, source, new Date().toISOString()]);
  } catch {}
}
export function listPlays(limit = 100): { id: string; episode_id: string; source: string; played_at: string }[] {
  try {
    return getDb().getAllSync<{ id: string; episode_id: string; source: string; played_at: string }>(`SELECT * FROM plays ORDER BY played_at DESC LIMIT ?`, [limit]);
  } catch {
    return [];
  }
}
