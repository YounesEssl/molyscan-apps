import { useOutboxStore } from '@/stores/outbox.store';
import { enqueue } from './repository';
import { saveImage } from './imageStore';
import { triggerSync } from './connectivity';
import { createOutboxId, type WorkflowCreatePayload } from './types';

export interface ScanLocation {
  lat?: number;
  lng?: number;
  label?: string;
}

/**
 * Queue a product scan for later analysis. The image is written to disk and the
 * mutation is replayed against /scans/analyze-image once connectivity returns.
 * Returns the outbox id (also used as the optimistic record id).
 */
export async function enqueueScanAnalysis(args: {
  base64: string;
  mimeType: string;
  message?: string;
  location?: ScanLocation | null;
}): Promise<string> {
  const id = createOutboxId();
  const imagePath = await saveImage(id, args.base64);
  await enqueue({
    id,
    kind: 'scan_analysis',
    payload: {
      message: args.message,
      locationLat: args.location?.lat,
      locationLng: args.location?.lng,
      locationLabel: args.location?.label,
    },
    imagePath,
    mimeType: args.mimeType,
  });
  await afterEnqueue();
  return id;
}

/** Queue a price-request (workflow) creation. Returns the outbox id. */
export async function enqueueWorkflowCreate(payload: WorkflowCreatePayload): Promise<string> {
  const id = createOutboxId();
  await enqueue({ id, kind: 'workflow_create', payload });
  await afterEnqueue();
  return id;
}

async function afterEnqueue(): Promise<void> {
  await useOutboxStore.getState().refreshCounts();
  // Flush immediately when this enqueue came from a transient network error
  // while still technically online; a no-op when genuinely offline.
  triggerSync();
}
