import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { IFileStorage } from '../../application/ports/file-storage.port';

@Injectable()
export class S3FileStorageService implements IFileStorage {
  private readonly logger = new Logger(S3FileStorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(configService: ConfigService) {
    const endpoint = configService.get<string>('STORAGE_ENDPOINT');
    const accessKeyId = configService.get<string>('STORAGE_ACCESS_KEY_ID');
    const secretAccessKey = configService.get<string>('STORAGE_SECRET_ACCESS_KEY');
    this.bucket = configService.get<string>('STORAGE_BUCKET', '');
    this.publicUrl = configService.get<string>('STORAGE_PUBLIC_URL', '').replace(/\/+$/, '');

    if (endpoint && accessKeyId && secretAccessKey && this.bucket && this.publicUrl) {
      this.client = new S3Client({
        endpoint,
        region: configService.get<string>('STORAGE_REGION', 'ap-southeast-1'),
        credentials: { accessKeyId, secretAccessKey },
        // Supabase/MinIO nhận tên bucket trong đường dẫn thay vì tên miền con
        forcePathStyle: true,
      });
    } else {
      this.client = null;
      this.logger.warn('Chưa cấu hình STORAGE_* trong .env, API upload ảnh sẽ trả lỗi 503.');
    }
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableException('Kho lưu ảnh chưa được cấu hình, vui lòng liên hệ quản trị viên');
    }

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          // Tên file là UUID, không bao giờ bị ghi đè nên cho trình duyệt giữ lâu
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    } catch (error) {
      this.logger.error(`Tải ${key} lên kho lưu ảnh thất bại`, (error as Error).stack);
      throw new ServiceUnavailableException('Không tải được ảnh lên kho lưu trữ, vui lòng thử lại sau');
    }

    return `${this.publicUrl}/${key}`;
  }
}
