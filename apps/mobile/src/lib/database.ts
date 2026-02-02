import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('molyscan.db');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS offline_scans (
      id TEXT PRIMARY KEY NOT NULL,
      barcode TEXT NOT NULL,
      scan_data TEXT NOT NULL,
      location TEXT,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS offline_actions (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
  `);
  return db;
}

export interface OfflineScanRow {
  id: string;
  barcode: string;
  scan_data: string;
  location: string | null;
  created_at: string;
  synced: number;
}

export interface OfflineActionRow {
  id: string;
  type: string;
  payload: string;
  created_at: string;
  synced: number;
}

export async function insertOfflineScan(
  id: string,
  barcode: string,
  scanData: string,
  location: string | null,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT OR REPLACE INTO offline_scans (id, barcode, scan_data, location, created_at, synced) VALUES (?, ?, ?, ?, ?, 0)',
    id,
    barcode,
    scanData,
    location,
    new Date().toISOString(),
  );
}

export async function insertOfflineAction(
  id: string,
  type: string,
  payload: string,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT OR REPLACE INTO offline_actions (id, type, payload, created_at, synced) VALUES (?, ?, ?, ?, 0)',
    id,
    type,
    payload,
    new Date().toISOString(),
  );
}

export async function getUnsyncedScans(): Promise<OfflineScanRow[]> {
  const database = await getDatabase();
  return database.getAllAsync<OfflineScanRow>(
    'SELECT * FROM offline_scans WHERE synced = 0 ORDER BY created_at ASC',
  );
}

export async function getUnsyncedActions(): Promise<OfflineActionRow[]> {
  const database = await getDatabase();
  return database.getAllAsync<OfflineActionRow>(
    'SELECT * FROM offline_actions WHERE synced = 0 ORDER BY created_at ASC',
  );
}

export async function markScanAsSynced(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('UPDATE offline_scans SET synced = 1 WHERE id = ?', id);
}

export async function markActionAsSynced(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('UPDATE offline_actions SET synced = 1 WHERE id = ?', id);
}

export async function clearSynced(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync(`
    DELETE FROM offline_scans WHERE synced = 1;
    DELETE FROM offline_actions WHERE synced = 1;
  `);
}

export async function getUnsyncedCount(): Promise<number> {
  const database = await getDatabase();
  const scans = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM offline_scans WHERE synced = 0',
  );
  const actions = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM offline_actions WHERE synced = 0',
  );
  return (scans?.count ?? 0) + (actions?.count ?? 0);
}
