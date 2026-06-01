/**
 * Outbox queue — shared types.
 *
 * The outbox stores *intended mutations* performed while offline (or that
 * failed due to a network error) and replays them in FIFO order once
 * connectivity returns. Each kind maps to a typed payload and a dedicated
 * handler (see ./handlers).
 */

export type OutboxKind = 'scan_analysis' | 'workflow_create';

export type OutboxStatus = 'pending' | 'in_flight' | 'failed';

/** Body for POST /scans/analyze-image (the image itself lives on disk). */
export interface ScanAnalysisPayload {
  message?: string;
  locationLat?: number;
  locationLng?: number;
  locationLabel?: string;
}

/** Body for POST /workflows. */
export interface WorkflowCreatePayload {
  scanId: string;
  productName: string;
  molydalRef: string;
  // Optionnels : la demande de prix se fait sans formulaire (simple envoi).
  clientName?: string;
  quantity?: number;
  unit?: string;
  requestedPrice?: number;
}

export interface OutboxPayloadMap {
  scan_analysis: ScanAnalysisPayload;
  workflow_create: WorkflowCreatePayload;
}

/** A queued mutation as persisted in SQLite (camelCase view). */
export interface OutboxRow {
  id: string;
  kind: OutboxKind;
  /** JSON-encoded payload (see OutboxPayloadMap). */
  payload: string;
  /** Absolute file:// path of the attached image, for scan_analysis only. */
  imagePath: string | null;
  mimeType: string | null;
  status: OutboxStatus;
  retryCount: number;
  /** ISO timestamp — the row is eligible for sync once now >= this. */
  nextAttemptAt: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Client-generated id, also used as the server idempotency key. */
export function createOutboxId(): string {
  return `obx-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
