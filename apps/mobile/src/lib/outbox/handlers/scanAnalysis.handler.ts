import { api } from '@/lib/axios';
import { ENDPOINTS } from '@/constants/api';
import { readImageBase64 } from '../imageStore';
import type { OutboxHandler } from './types';
import type { OutboxRow, ScanAnalysisPayload } from '../types';

/**
 * analyze-image is throttled to 5 requests / minute server-side. Space replays
 * by ~13s so a backlog drains without tripping the 429 limiter.
 */
const MIN_INTERVAL_MS = 13_000;

/** Gemini Vision analysis can be slow; allow a generous per-request timeout. */
const ANALYZE_TIMEOUT_MS = 90_000;

export const scanAnalysisHandler: OutboxHandler = {
  kind: 'scan_analysis',
  minIntervalMs: MIN_INTERVAL_MS,

  async send(row: OutboxRow): Promise<unknown> {
    if (!row.imagePath) {
      throw new Error('scan_analysis outbox row is missing its image path');
    }
    const base64 = await readImageBase64(row.imagePath);
    const payload = JSON.parse(row.payload) as ScanAnalysisPayload;

    const response = await api.post(
      ENDPOINTS.scans.analyzeImage,
      {
        clientRequestId: row.id,
        image: base64,
        mimeType: row.mimeType ?? 'image/jpeg',
        message: payload.message,
        locationLat: payload.locationLat,
        locationLng: payload.locationLng,
        locationLabel: payload.locationLabel,
      },
      { timeout: ANALYZE_TIMEOUT_MS },
    );
    return response.data;
  },
};
