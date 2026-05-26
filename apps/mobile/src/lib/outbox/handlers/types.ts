import type { OutboxKind, OutboxRow } from '../types';

/**
 * A handler encapsulates everything kind-specific about a queued mutation:
 * how to send it, how to apply the server response to client state, and how
 * fast it may be replayed (server-side throttling).
 */
export interface OutboxHandler {
  kind: OutboxKind;
  /**
   * Minimum delay between two successful sends of this kind, in ms.
   * Used to respect server rate limits (e.g. analyze-image = 5/min).
   */
  minIntervalMs?: number;
  /** Perform the network request. Resolve with the server response; throw on failure. */
  send(row: OutboxRow): Promise<unknown>;
  /** Apply the confirmed result to client state (stores/caches). Best-effort. */
  onSuccess?(row: OutboxRow, response: unknown): Promise<void> | void;
}
