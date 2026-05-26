import { logger } from '@/lib/logger';
import * as repo from './repository';
import { deleteImage } from './imageStore';
import { getHandler } from './handlers';
import {
  MAX_RETRIES,
  classifyError,
  computeBackoffMs,
  retryAfterMs,
  errorMessage,
} from './retryPolicy';
import type { OutboxRow } from './types';

export interface SyncProgress {
  current: number;
  total: number;
}

export interface SyncCallbacks {
  /** Whether the device currently has connectivity. */
  isOnline: () => boolean;
  onProgress?: (progress: SyncProgress | null) => void;
  onSyncingChange?: (syncing: boolean) => void;
  /** Invoked whenever the queue contents change, so the store can refresh counts. */
  onCountsChange?: () => Promise<void> | void;
  /** Invoked once after a run that synced at least one item. */
  onComplete?: (syncedCount: number) => void;
}

const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Mutex — guarantees a single concurrent run. */
let running = false;

/**
 * Drains the outbox: replays every due mutation in FIFO order, deleting rows on
 * success and rescheduling (or dead-lettering) them on failure. Safe to call
 * repeatedly and concurrently — overlapping calls are coalesced.
 */
export async function processOutbox(cb: SyncCallbacks): Promise<void> {
  if (running) return;
  if (!cb.isOnline()) return;

  running = true;
  cb.onSyncingChange?.(true);
  let syncedCount = 0;
  /** Last successful send time per kind, for throttling. */
  const lastSentAt: Partial<Record<OutboxRow['kind'], number>> = {};

  try {
    // Single drain pass: rescheduled rows get a future next_attempt_at and so
    // drop out of listDue, which guarantees termination.
    const due = await repo.listDue();
    if (due.length === 0) return;

    cb.onProgress?.({ current: 0, total: due.length });
    let processed = 0;

    for (const row of due) {
      if (!cb.isOnline()) break;
      processed += 1;

      const handler = getHandler(row.kind);

      // Respect per-kind server rate limits.
      const interval = handler.minIntervalMs;
      const last = lastSentAt[row.kind];
      if (interval && last) {
        const wait = interval - (Date.now() - last);
        if (wait > 0) await delay(wait);
      }

      await repo.markInFlight(row.id);

      try {
        const response = await handler.send(row);
        await handler.onSuccess?.(row, response);
        await deleteImage(row.imagePath);
        await repo.remove(row.id);
        syncedCount += 1;
        lastSentAt[row.kind] = Date.now();
      } catch (error) {
        await handleFailure(row, error);
      }

      cb.onProgress?.({ current: processed, total: due.length });
      await cb.onCountsChange?.();
    }

    if (syncedCount > 0) cb.onComplete?.(syncedCount);
  } catch (error) {
    logger.error('[outbox] sync run crashed', error);
  } finally {
    cb.onProgress?.(null);
    cb.onSyncingChange?.(false);
    await cb.onCountsChange?.();
    running = false;
  }
}

async function handleFailure(row: OutboxRow, error: unknown): Promise<void> {
  const kind = classifyError(error);
  const message = errorMessage(error);

  if (kind === 'duplicate') {
    // Server already has this mutation (idempotency hit) — treat as done.
    await deleteImage(row.imagePath);
    await repo.remove(row.id);
    logger.info(`[outbox] ${row.id} resolved as duplicate (already synced)`);
    return;
  }

  const nextRetry = row.retryCount + 1;

  if (kind === 'fatal' || nextRetry >= MAX_RETRIES) {
    await repo.markFailed(row.id, message);
    logger.warn(`[outbox] ${row.id} dead-lettered (${kind}): ${message}`);
    return;
  }

  const backoff = Math.max(computeBackoffMs(row.retryCount), retryAfterMs(error) ?? 0);
  const nextAttemptAt = new Date(Date.now() + backoff).toISOString();
  await repo.rescheduleRetry(row.id, nextRetry, nextAttemptAt, message);
  logger.info(`[outbox] ${row.id} retry ${nextRetry} in ${Math.round(backoff)}ms`);
}
