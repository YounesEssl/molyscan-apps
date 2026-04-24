import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface AttachmentEntry {
  base64: string;
  mediaType: string;
  filename: string;
}

@Injectable()
export class AttachmentStore {
  private readonly entries = new Map<string, AttachmentEntry & { expiresAt: number }>();
  private readonly TTL_MS = 15 * 60 * 1000;

  put(base64: string, mediaType: string, filename: string): string {
    const id = randomUUID();
    this.entries.set(id, { base64, mediaType, filename, expiresAt: Date.now() + this.TTL_MS });
    this.evict();
    return id;
  }

  get(id: string): AttachmentEntry | undefined {
    const entry = this.entries.get(id);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(id);
      return undefined;
    }
    return entry;
  }

  remove(id: string): void {
    this.entries.delete(id);
  }

  private evict(): void {
    const now = Date.now();
    for (const [id, entry] of this.entries) {
      if (now > entry.expiresAt) this.entries.delete(id);
    }
  }
}
