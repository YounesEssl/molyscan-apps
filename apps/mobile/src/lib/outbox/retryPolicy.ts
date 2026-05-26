import axios from 'axios';

/**
 * Pure retry/backoff policy for the outbox sync engine. Kept free of React
 * Native imports so it can be unit-tested in isolation.
 */

export const MAX_RETRIES = 8;
export const BASE_BACKOFF_MS = 2_000;
export const MAX_BACKOFF_MS = 5 * 60_000;

export type ErrorClass = 'retryable' | 'fatal' | 'duplicate';

/** Decide how to react to a failed send. */
export function classifyError(error: unknown): ErrorClass {
  if (!axios.isAxiosError(error)) return 'retryable';
  const status = error.response?.status;
  if (status === undefined) return 'retryable'; // network error / timeout
  if (status === 409) return 'duplicate'; // idempotency: already processed server-side
  if (status === 429 || status === 408 || status >= 500) return 'retryable';
  return 'fatal'; // 400/401/403/404/422 — replaying won't help
}

/** Exponential backoff with full jitter, capped at MAX_BACKOFF_MS. */
export function computeBackoffMs(retryCount: number): number {
  const exponential = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** retryCount);
  const jitter = Math.random() * 1_000;
  return exponential + jitter;
}

/** Parse a Retry-After header (seconds) into milliseconds, if present. */
export function retryAfterMs(error: unknown): number | null {
  if (!axios.isAxiosError(error)) return null;
  const header = error.response?.headers?.['retry-after'];
  if (!header) return null;
  const seconds = Number(header);
  return Number.isFinite(seconds) ? seconds * 1_000 : null;
}

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return `HTTP ${error.response?.status ?? 'network'}: ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
}
