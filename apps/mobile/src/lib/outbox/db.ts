import * as SQLite from 'expo-sqlite';

/**
 * Single shared SQLite handle for the outbox. Memoized as a promise so
 * concurrent callers never trigger a double open or a race on migration.
 */
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getOutboxDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = init();
  }
  return dbPromise;
}

async function init(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('molyscan.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS outbox (
      id              TEXT PRIMARY KEY NOT NULL,
      kind            TEXT NOT NULL,
      payload         TEXT NOT NULL,
      image_path      TEXT,
      mime_type       TEXT,
      status          TEXT NOT NULL DEFAULT 'pending',
      retry_count     INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TEXT NOT NULL,
      last_error      TEXT,
      created_at      TEXT NOT NULL,
      updated_at      TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_outbox_due ON outbox (status, next_attempt_at);

    -- Migration: the previous prototype used these tables. They are replaced
    -- by the unified outbox and dropped so no stale rows linger.
    DROP TABLE IF EXISTS offline_scans;
    DROP TABLE IF EXISTS offline_actions;
  `);
  return db;
}
