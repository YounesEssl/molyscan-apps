import { getOutboxDb } from './db';
import type { OutboxKind, OutboxRow } from './types';

interface DbRow {
  id: string;
  kind: string;
  payload: string;
  image_path: string | null;
  mime_type: string | null;
  status: string;
  retry_count: number;
  next_attempt_at: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

function toRow(r: DbRow): OutboxRow {
  return {
    id: r.id,
    kind: r.kind as OutboxKind,
    payload: r.payload,
    imagePath: r.image_path,
    mimeType: r.mime_type,
    status: r.status as OutboxRow['status'],
    retryCount: r.retry_count,
    nextAttemptAt: r.next_attempt_at,
    lastError: r.last_error,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export interface EnqueueInput {
  id: string;
  kind: OutboxKind;
  payload: unknown;
  imagePath?: string | null;
  mimeType?: string | null;
}

export async function enqueue(input: EnqueueInput): Promise<void> {
  const db = await getOutboxDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO outbox
       (id, kind, payload, image_path, mime_type, status, retry_count, next_attempt_at, last_error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, NULL, ?, ?)`,
    input.id,
    input.kind,
    JSON.stringify(input.payload),
    input.imagePath ?? null,
    input.mimeType ?? null,
    now,
    now,
    now,
  );
}

/** Rows eligible for a sync attempt right now, oldest first (FIFO). */
export async function listDue(nowIso: string = new Date().toISOString()): Promise<OutboxRow[]> {
  const db = await getOutboxDb();
  const rows = await db.getAllAsync<DbRow>(
    `SELECT * FROM outbox WHERE status != 'failed' AND next_attempt_at <= ? ORDER BY created_at ASC`,
    nowIso,
  );
  return rows.map(toRow);
}

/** Every non-dead-lettered row, regardless of schedule (for counts/UI). */
export async function listActive(): Promise<OutboxRow[]> {
  const db = await getOutboxDb();
  const rows = await db.getAllAsync<DbRow>(
    `SELECT * FROM outbox WHERE status != 'failed' ORDER BY created_at ASC`,
  );
  return rows.map(toRow);
}

export async function listFailed(): Promise<OutboxRow[]> {
  const db = await getOutboxDb();
  const rows = await db.getAllAsync<DbRow>(
    `SELECT * FROM outbox WHERE status = 'failed' ORDER BY created_at ASC`,
  );
  return rows.map(toRow);
}

export async function markInFlight(id: string): Promise<void> {
  const db = await getOutboxDb();
  await db.runAsync(
    `UPDATE outbox SET status = 'in_flight', updated_at = ? WHERE id = ?`,
    new Date().toISOString(),
    id,
  );
}

/** Reschedule a failed attempt for a later retry (still active). */
export async function rescheduleRetry(
  id: string,
  retryCount: number,
  nextAttemptAtIso: string,
  lastError: string,
): Promise<void> {
  const db = await getOutboxDb();
  await db.runAsync(
    `UPDATE outbox
       SET status = 'pending', retry_count = ?, next_attempt_at = ?, last_error = ?, updated_at = ?
     WHERE id = ?`,
    retryCount,
    nextAttemptAtIso,
    lastError,
    new Date().toISOString(),
    id,
  );
}

/** Move a row to the dead-letter state after exhausting retries. */
export async function markFailed(id: string, lastError: string): Promise<void> {
  const db = await getOutboxDb();
  await db.runAsync(
    `UPDATE outbox SET status = 'failed', last_error = ?, updated_at = ? WHERE id = ?`,
    lastError,
    new Date().toISOString(),
    id,
  );
}

export async function remove(id: string): Promise<void> {
  const db = await getOutboxDb();
  await db.runAsync(`DELETE FROM outbox WHERE id = ?`, id);
}

/** Re-queue all dead-lettered rows (manual "retry failed" action). */
export async function retryAllFailed(): Promise<void> {
  const db = await getOutboxDb();
  await db.runAsync(
    `UPDATE outbox
       SET status = 'pending', retry_count = 0, next_attempt_at = ?, last_error = NULL, updated_at = ?
     WHERE status = 'failed'`,
    new Date().toISOString(),
    new Date().toISOString(),
  );
}

/**
 * Reset rows stuck in 'in_flight' (app was killed mid-send) back to pending.
 * Run once at startup before the first sync.
 */
export async function recoverInFlight(): Promise<void> {
  const db = await getOutboxDb();
  await db.runAsync(
    `UPDATE outbox SET status = 'pending', updated_at = ? WHERE status = 'in_flight'`,
    new Date().toISOString(),
  );
}

export interface OutboxCounts {
  active: number;
  failed: number;
}

export async function counts(): Promise<OutboxCounts> {
  const db = await getOutboxDb();
  const active = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM outbox WHERE status != 'failed'`,
  );
  const failed = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM outbox WHERE status = 'failed'`,
  );
  return { active: active?.c ?? 0, failed: failed?.c ?? 0 };
}

/** Absolute image paths still referenced by any row (for orphan cleanup). */
export async function activeImagePaths(): Promise<string[]> {
  const db = await getOutboxDb();
  const rows = await db.getAllAsync<{ image_path: string | null }>(
    `SELECT image_path FROM outbox WHERE image_path IS NOT NULL`,
  );
  return rows.map((r) => r.image_path).filter((p): p is string => p !== null);
}
