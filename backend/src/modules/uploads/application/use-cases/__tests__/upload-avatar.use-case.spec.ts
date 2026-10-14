import { describe, expect, it } from '@jest/globals';
import sharp from 'sharp';
import { UploadAvatarUseCase } from '../upload-avatar.use-case';
describe('Avatar upload', () => {
  let uploaded: Buffer;
  let type: string;
  const storage = {
    upload: async (key: string, data: Buffer, contentType: string) => {
      uploaded = data;
      type = contentType;
      return `https://storage.example/${key}`;
    },
  };
  it('decodes the actual PNG and resizes to a 512 square WebP', async () => {
    const data = await sharp({
      create: { width: 900, height: 600, channels: 3, background: '#aabbcc' },
    })
      .png()
      .toBuffer();
    const url = await new UploadAvatarUseCase(storage).execute({
      buffer: data,
      size: data.length,
    });
    expect(url).toMatch(/avatars\/.+\.webp$/);
    expect(await sharp(uploaded).metadata()).toMatchObject({
      format: 'webp',
      width: 512,
      height: 512,
    });
    expect(type).toBe('image/webp');
  });
  it('rejects forged content, oversized buffers and decompression bombs', async () => {
    const useCase = new UploadAvatarUseCase(storage);
    await expect(
      useCase.execute({ buffer: Buffer.from('not an image'), size: 20 }),
    ).rejects.toThrow();
    await expect(
      useCase.execute({ buffer: Buffer.alloc(1), size: 5 * 1024 * 1024 + 1 }),
    ).rejects.toThrow();
    const huge = await sharp({
      create: { width: 4001, height: 4000, channels: 3, background: '#fff' },
    })
      .png()
      .toBuffer();
    await expect(
      useCase.execute({ buffer: huge, size: huge.length }),
    ).rejects.toThrow();
  });
});
