import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { S3FileStorageService } from '../s3-file-storage.service';

const FULL_CONFIG: Record<string, string> = {
  STORAGE_ENDPOINT: 'https://ref.storage.supabase.co/storage/v1/s3',
  STORAGE_REGION: 'ap-southeast-1',
  STORAGE_BUCKET: 'glowup-images',
  STORAGE_ACCESS_KEY_ID: 'key-id',
  STORAGE_SECRET_ACCESS_KEY: 'secret',
  STORAGE_PUBLIC_URL: 'https://ref.supabase.co/storage/v1/object/public/glowup-images/',
};

const configOf = (values: Record<string, string>) =>
  ({ get: (name: string, fallback?: string) => values[name] ?? fallback }) as unknown as ConfigService;

describe('S3FileStorageService', () => {
  let send: jest.SpyInstance;

  beforeEach(() => {
    send = jest.spyOn(S3Client.prototype, 'send').mockResolvedValue({} as never);
  });

  afterEach(() => jest.restoreAllMocks());

  it('gửi PutObject đúng bucket, key, loại file và trả link công khai', async () => {
    const service = new S3FileStorageService(configOf(FULL_CONFIG));
    const body = Buffer.from('abc');

    const url = await service.upload('products/a.png', body, 'image/png');

    const command = send.mock.calls[0][0] as PutObjectCommand;
    expect(command.input).toMatchObject({
      Bucket: 'glowup-images',
      Key: 'products/a.png',
      Body: body,
      ContentType: 'image/png',
    });
    expect(url).toBe('https://ref.supabase.co/storage/v1/object/public/glowup-images/products/a.png');
  });

  it('báo 503 khi chưa cấu hình .env, server vẫn khởi tạo được', async () => {
    const service = new S3FileStorageService(configOf({}));

    await expect(service.upload('products/a.png', Buffer.from('abc'), 'image/png')).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(send).not.toHaveBeenCalled();
  });

  it('đổi lỗi mạng/khóa sai của kho thành 503 tiếng Việt', async () => {
    send.mockRejectedValue(new Error('AccessDenied'));
    const service = new S3FileStorageService(configOf(FULL_CONFIG));

    await expect(service.upload('products/a.png', Buffer.from('abc'), 'image/png')).rejects.toThrow(
      'Không tải được ảnh lên kho lưu trữ, vui lòng thử lại sau',
    );
  });
});
