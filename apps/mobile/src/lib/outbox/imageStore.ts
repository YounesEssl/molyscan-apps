import * as FileSystem from 'expo-file-system/legacy';
import { logger } from '@/lib/logger';

/**
 * Persists scan images on disk (not in SQLite) so the outbox rows stay light
 * and large base64 blobs survive app restarts without bloating the database.
 */
function dir(): string {
  if (!FileSystem.documentDirectory) {
    throw new Error('FileSystem.documentDirectory unavailable');
  }
  return `${FileSystem.documentDirectory}outbox/`;
}

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(dir());
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir(), { intermediates: true });
  }
}

export async function saveImage(id: string, base64: string): Promise<string> {
  await ensureDir();
  const path = `${dir()}${id}.jpg`;
  await FileSystem.writeAsStringAsync(path, base64, { encoding: 'base64' });
  return path;
}

export async function readImageBase64(path: string): Promise<string> {
  return FileSystem.readAsStringAsync(path, { encoding: 'base64' });
}

export async function deleteImage(path: string | null): Promise<void> {
  if (!path) return;
  try {
    await FileSystem.deleteAsync(path, { idempotent: true });
  } catch (error) {
    logger.warn('[outbox] deleteImage failed', error);
  }
}

/**
 * Removes image files that are no longer referenced by any outbox row.
 * Called at startup to reclaim space from rows that were cleared abnormally.
 */
export async function cleanupOrphans(activePaths: readonly string[]): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(dir());
    if (!info.exists) return;
    const active = new Set(activePaths);
    const files = await FileSystem.readDirectoryAsync(dir());
    for (const file of files) {
      const full = `${dir()}${file}`;
      if (!active.has(full)) {
        await FileSystem.deleteAsync(full, { idempotent: true });
      }
    }
  } catch (error) {
    logger.warn('[outbox] cleanupOrphans failed', error);
  }
}
