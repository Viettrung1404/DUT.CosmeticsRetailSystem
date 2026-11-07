import {
  BadRequestException,
  Inject,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { FILE_STORAGE, IFileStorage } from '../ports/file-storage.port';
import { MAX_IMAGE_SIZE, UploadImageInput } from './upload-image.use-case';
@Injectable()
export class UploadAvatarUseCase {
  constructor(@Inject(FILE_STORAGE) private readonly storage: IFileStorage) {}
  async execute(file: UploadImageInput | undefined): Promise<string> {
    if (!file?.buffer.length)
      throw new BadRequestException('Vui lòng chọn ảnh');
    if (file.size > MAX_IMAGE_SIZE || file.buffer.length > MAX_IMAGE_SIZE)
      throw new PayloadTooLargeException('Ảnh tối đa 5 MB');
    let buffer: Buffer;
    try {
      const image = sharp(file.buffer, {
        limitInputPixels: 16_000_000,
        animated: false,
        failOn: 'warning',
      });
      const metadata = await image.metadata();
      if (
        !['jpeg', 'png', 'webp'].includes(metadata.format || '') ||
        (metadata.pages ?? 1) > 1
      )
        throw new Error('Unsupported image');
      buffer = await image
        .rotate()
        .resize(512, 512, { fit: 'cover' })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      throw new BadRequestException(
        'Ảnh JPG/PNG/WebP không hợp lệ hoặc vượt 16 megapixel',
      );
    }
    return this.storage.upload(
      `avatars/${randomUUID()}.webp`,
      buffer,
      'image/webp',
    );
  }
}
