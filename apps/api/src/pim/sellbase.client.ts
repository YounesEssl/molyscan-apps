import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { request as httpsRequest } from 'https';
import { chmodSync, readFileSync, writeFileSync } from 'fs';

export type SellbaseDatum = {
  id: number;
  id_element: number;
  id_valeur: number;
  contenu: string;
  id_langue: number;
  date_de_modification?: string | null;
};

export type SellbaseElement = Record<string, number | string | null>;

@Injectable()
export class SellbaseClient {
  private token: string | null = null;
  private tokenExpiresAt = 0;
  private refreshToken: string | null = null;

  constructor(private readonly config: ConfigService) {}

  private get origin() {
    return this.config.get('SELLBASE_API_URL', 'https://sellapi-preprod.sellbase-plateforme.com');
  }

  private get apiBase() {
    const server = this.config.get('SELLBASE_SERVER', 'base05');
    const base = this.config.get('SELLBASE_BASE', 'c_molydal');
    return `${this.origin}/api/${server}/${base}`;
  }

  get publicationId(): number {
    return Number(this.config.get('SELLBASE_PUBLICATION_ID', '52903'));
  }

  private async authenticate(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiresAt) return this.token;
    this.loadTokenCache();
    if (this.token && Date.now() < this.tokenExpiresAt) return this.token;
    if (this.refreshToken) {
      const refreshed = await fetch(`${this.origin}/api/token/refresh`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken }), signal: AbortSignal.timeout(20_000),
      });
      if (refreshed.ok) {
        const json = (await refreshed.json()) as { token?: string; refresh_token?: string };
        if (json.token) {
          this.token = json.token;
          this.refreshToken = json.refresh_token ?? null;
          this.tokenExpiresAt = Date.now() + 55 * 60_000;
          this.saveTokenCache();
          return this.token;
        }
      }
      this.refreshToken = null;
    }
    const email = this.config.getOrThrow<string>('SELLBASE_EMAIL');
    const password = this.config.getOrThrow<string>('SELLBASE_PASSWORD');
    const response = await fetch(`${this.origin}/api/login_check`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Sellbase login failed (${response.status})`);
    const json = (await response.json()) as { token?: string; refresh_token?: string };
    if (!json.token) throw new Error('Sellbase login returned no token');
    this.token = json.token;
    this.refreshToken = json.refresh_token ?? null;
    this.tokenExpiresAt = Date.now() + 55 * 60_000;
    this.saveTokenCache();
    return this.token;
  }

  private get tokenCachePath() {
    return this.config.get('SELLBASE_TOKEN_CACHE_PATH', '/tmp/molyscan-sellbase-token.json');
  }

  private loadTokenCache() {
    try {
      const cached = JSON.parse(readFileSync(this.tokenCachePath, 'utf8')) as { token?: string; refreshToken?: string; expiresAt?: number };
      this.token = cached.token ?? null;
      this.refreshToken = cached.refreshToken ?? null;
      this.tokenExpiresAt = cached.expiresAt ?? 0;
    } catch { /* first run or invalid cache */ }
  }

  private saveTokenCache() {
    writeFileSync(this.tokenCachePath, JSON.stringify({ token: this.token, refreshToken: this.refreshToken, expiresAt: this.tokenExpiresAt }), { mode: 0o600 });
    chmodSync(this.tokenCachePath, 0o600);
  }

  private async request<T>(path: string, body?: unknown): Promise<T> {
    const token = await this.authenticate();
    if (body) {
      const payload = Buffer.from(JSON.stringify(body));
      return new Promise<T>((resolve, reject) => {
        const req = httpsRequest(`${this.apiBase}${path}`, {
          method: 'GET',
          headers: {
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
            'content-length': String(payload.length),
            connection: 'close',
          },
          timeout: 60_000,
        }, (response) => {
          const chunks: Buffer[] = [];
          let size = 0;
          response.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > 30 * 1024 * 1024) req.destroy(new Error('Sellbase response exceeds 30 MB'));
            else chunks.push(chunk);
          });
          response.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            if (!response.statusCode || response.statusCode >= 400) return reject(new Error(`Sellbase GET ${path} failed (${response.statusCode}): ${raw.slice(0, 300)}`));
            try { resolve(JSON.parse(raw) as T); }
            catch { reject(new Error(`Sellbase GET ${path} returned invalid JSON`)); }
          });
        });
        req.on('timeout', () => req.destroy(new Error('Sellbase request timed out')));
        req.on('error', reject);
        req.end(payload);
      });
    }
    const response = await fetch(`${this.apiBase}${path}`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      const message = (await response.text()).slice(0, 300);
      throw new Error(`Sellbase GET ${path} failed (${response.status}): ${message}`);
    }
    return response.json() as Promise<T>;
  }

  async getCharacteristics() {
    const result = await this.request<{ caracs: Record<string, { id: number; libelle: string }> }>(
      `/carac/getAll?baseId=${this.publicationId}`,
    );
    return result.caracs;
  }

  async getElements(level: 4 | 5): Promise<SellbaseElement[]> {
    const query = new URLSearchParams({
      baseId: String(this.publicationId), level: String(level), page: '0',
      offset: '1000', orderField: 'id', order: 'ASC',
    });
    const result = await this.request<{ elements: SellbaseElement[] }>(`/element/getByLevel?${query}`);
    return result.elements ?? [];
  }

  async getData(elementIds: number[], baseId: number): Promise<Record<string, Record<string, SellbaseDatum>>> {
    const all: Record<string, Record<string, SellbaseDatum>> = {};
    for (let i = 0; i < elementIds.length; i += 50) {
      const batch = elementIds.slice(i, i + 50);
      const result = await this.request<{ datas: Record<string, Record<string, SellbaseDatum>> }>(
        '/data/getDataByMultiElementFull',
        { baseId, elementIds: batch },
      );
      Object.assign(all, result.datas ?? {});
    }
    return all;
  }

  /**
   * Standard-HTTP fallback for Sellbase's non-standard GET-with-body batch API.
   * Reads the base in pages and retains only the published elements we need.
   */
  async getPublishedData(elementIds: number[], baseId: number): Promise<Record<string, Record<string, SellbaseDatum>>> {
    const wanted = new Set(elementIds);
    const grouped: Record<string, Record<string, SellbaseDatum>> = {};
    const limit = 1000;
    for (let page = 1; ; page++) {
      const query = new URLSearchParams({ baseId: String(baseId), page: String(page), limit: String(limit), orderField: 'id', order: 'ASC' });
      const result = await this.request<{ datas: SellbaseDatum[] }>(`/data/getDataByBaseId?${query}`);
      const rows = result.datas ?? [];
      for (const datum of rows) {
        if (!wanted.has(datum.id_element)) continue;
        (grouped[String(datum.id_element)] ??= {})[String(datum.id_valeur)] = datum;
      }
      if (rows.length < limit) break;
    }
    return grouped;
  }

  async downloadDocument(fileName: string, options?: { productInstanceId?: number | null; kind?: string; language?: string }): Promise<Response> {
    if (options?.kind === 'technical_sheet' && options.productInstanceId) {
      const publicOrigin = this.config.get('MOLYDAL_PUBLIC_URL', 'https://www.molydal.com').replace(/\/$/, '');
      const language = ['fr', 'en', 'de', 'es', 'it'].includes(options.language ?? '') ? options.language : 'fr';
      return fetch(`${publicOrigin}/${language}/produit/${options.productInstanceId}/fiche-technique`, { signal: AbortSignal.timeout(30_000) });
    }
    const mediaBase = this.config.getOrThrow<string>('SELLBASE_MEDIA_BASE_URL').replace(/\/$/, '');
    const token = await this.authenticate();
    const safePath = fileName.split('/').map(encodeURIComponent).join('/');
    return fetch(`${mediaBase}/${safePath}`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30_000),
    });
  }
}
