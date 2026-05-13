import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { Readable } from 'stream';

@Injectable()
export class StorageService implements OnModuleInit {
  private client: Minio.Client;
  private bucket: string;
  private publicEndpoint: string | null;
  private readonly logger = new Logger(StorageService.name);

  constructor(private configService: ConfigService) {
    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'molyscan');
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.configService.get<number>('MINIO_PORT', 9000);
    const useSSL = this.configService.get<string>('MINIO_USE_SSL') === 'true';
    // Public endpoint for presigned URLs — needed when MinIO is on localhost
    // but clients are remote. Format: "http://51.77.158.155:9000" (no trailing slash)
    this.publicEndpoint = this.configService.get<string>('MINIO_PUBLIC_ENDPOINT', '') || null;
    this.client = new Minio.Client({
      endPoint: endpoint,
      port,
      useSSL,
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', 'molyscan'),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY', 'molyscan_dev'),
    });
  }

  async onModuleInit() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Bucket "${this.bucket}" created`);
      }
    } catch (error) {
      this.logger.warn(`MinIO not available: ${error}. File storage will not work.`);
    }
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': contentType,
    });
    return key;
  }

  async download(key: string): Promise<Readable> {
    return this.client.getObject(this.bucket, key);
  }

  async getPresignedUrl(key: string, expirySeconds = 3600): Promise<string> {
    const url = await this.client.presignedGetObject(this.bucket, key, expirySeconds);
    if (!this.publicEndpoint) return url;
    // Replace the internal endpoint (e.g. http://localhost:9000) with the
    // public-facing one so mobile clients can actually reach the URL.
    const parsed = new URL(url);
    const internal = `${parsed.protocol}//${parsed.host}`;
    return url.replace(internal, this.publicEndpoint);
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }
}
