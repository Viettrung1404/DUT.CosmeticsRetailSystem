import { ReturnImageStorage } from './return-image.storage';
import sharp = require('sharp');
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const mockSend = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: (...args: unknown[]) => mockSend(...args),
  })),
  PutObjectCommand: jest
    .fn()
    .mockImplementation((input) => ({ kind: 'put', ...input })),
  GetObjectCommand: jest
    .fn()
    .mockImplementation((input) => ({ kind: 'get', ...input })),
  DeleteObjectCommand: jest
    .fn()
    .mockImplementation((input) => ({ kind: 'delete', ...input })),
}));
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest
    .fn()
    .mockResolvedValue('https://private.example.invalid/signed'),
}));

describe('Private return evidence', () => {
  const values = {
    RETURN_STORAGE_BUCKET: 'private-evidence',
    RETURN_STORAGE_PRIVATE: 'true',
    STORAGE_ENDPOINT: 'https://storage.example.invalid',
    STORAGE_ACCESS_KEY_ID: 'test',
    STORAGE_SECRET_ACCESS_KEY: 'test',
  };
  const config = {
    get: (key: string, fallback?: unknown) => values[key] ?? fallback,
  } as any;
  let db: any;
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({});
    db = {
      $queryRaw: jest.fn(),
      returnAttachment: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({
          id: 'attachment',
          mimeType: 'image/jpeg',
          size: 100,
        }),
        findFirst: jest.fn(),
      },
    };
    db.$transaction = jest.fn((work) => work(db));
  });
  it('rejects non-images before writing an object', async () => {
    await expect(
      new ReturnImageStorage(db, config).upload(
        'user',
        Buffer.from('<script>attack</script>'),
      ),
    ).rejects.toThrow('INVALID_IMAGE');
    expect(mockSend).not.toHaveBeenCalled();
  });
  it('decodes and re-encodes images, strips metadata, and uses private cache control', async () => {
    const png = await sharp({
      create: { width: 2, height: 2, channels: 3, background: 'red' },
    })
      .png()
      .toBuffer();
    await new ReturnImageStorage(db, config).upload('user', png);
    const put = mockSend.mock.calls[0][0];
    expect(put.Bucket).toBe('private-evidence');
    expect(put.CacheControl).toBe('private, no-store');
    expect((await sharp(put.Body).metadata()).format).toBe('jpeg');
    expect(put.Key).toMatch(/^returns\/user\/.+\.jpg$/);
  });
  it('does not issue a signed URL for an attachment owned by someone else', async () => {
    db.returnAttachment.findFirst.mockResolvedValue(null);
    await expect(
      new ReturnImageStorage(db, config).url('other', 'attachment'),
    ).rejects.toThrow('ATTACHMENT_NOT_FOUND');
    expect(getSignedUrl).not.toHaveBeenCalled();
  });
  it('refuses a public or unconfigured evidence bucket', async () => {
    await expect(
      new ReturnImageStorage(db, {
        get: (_: string, fallback?: unknown) => fallback,
      } as any).upload('user', Buffer.from('image')),
    ).rejects.toThrow('PRIVATE_RETURN_STORAGE_NOT_CONFIGURED');
  });
});
