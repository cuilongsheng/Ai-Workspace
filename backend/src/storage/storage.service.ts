import { Injectable } from '@nestjs/common';
import { Client } from 'minio';
import { Readable } from 'stream';
import { resolveStorageConfig } from './storage.config';

@Injectable()
export class StorageService {
  private readonly client: Client;
  private readonly bucket: string;

  constructor() {
    const config = resolveStorageConfig();
    this.client = new Client({
      endPoint: config.endPoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });
    this.bucket = config.bucket;
  }

  async uploadFile(key: string, buffer: Buffer, mimeType: string) {
    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': mimeType,
    });

    return {
      bucket: this.bucket,
      key,
    };
  }
  async downloadFile(key: string) {
    const [stream, stat] = await Promise.all([
      this.client.getObject(this.bucket, key),
      this.client.statObject(this.bucket, key),
    ]);

    return {
      stream,
      contentType: stat.metaData['content-type'] ?? 'application/octet-stream',
      size: stat.size,
    };
  }

  async getFileBuffer(key: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, key);

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }
}
