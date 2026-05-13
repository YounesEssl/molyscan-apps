import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { Readable } from 'stream';

@Injectable()
export class StorageService implements OnModuleInit {
  private client: Minio.Client;
  private signingClient: Minio.Client;
  private bucket: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private configService: ConfigService) {
    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'molyscan');
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.configService.get<number>('MINIO_PORT', 9000);
    const useSSL = this.configService.get<string>('MINIO_USE_SSL') === 'true';
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY', 'molyscan');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY', 'molyscan_dev');

    // Internal client — for uploads, direct localhost connection
    this.client = new Minio.Client({ endPoint: endpoint, port, useSSL, accessKey, secretKey });

    // Signing client — presigned URLs must be signed with the host the mobile
    // client will use, otherwise the HMAC-SHA256 signature won't match (403).
    // MINIO_PUBLIC_ENDPOINT format: "51.77.158.155" (host only, no protocol/port)
    const publicHost = this.configService.get<string>('MINIO_PUBLIC_ENDPOINT', '') || endpoint;
    this.signingClient = new Minio.Client({
      endPoint: publicHost,
      port,
      useSSL,
      accessKey,
      secretKey,
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
    return this.signingClient.presignedGetObject(this.bucket, key, expirySeconds);
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }
}
