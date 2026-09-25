import { BadRequestException, Inject, Injectable, PayloadTooLargeException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FILE_STORAGE, IFileStorage } from '../ports/file-storage.port';

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_IMAGE_SIZE_MESSAGE = 'Ảnh vượt quá dung lượng cho phép (tối đa 5 MB)';

export const UPLOAD_FOLDERS = ['products', 'brands', 'categories'] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

export interface UploadImageInput {
  buffer: Buffer;
  size: number;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Nhận dạng ảnh theo các byte đầu file, không tin mimetype hay đuôi file do client gửi
function detectImageType(buffer: Buffer): { ext: string; contentType: string } | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', contentType: 'image/jpeg' };
  }
  if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { ext: 'png', contentType: 'image/png' };
  }
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { ext: 'webp', contentType: 'image/webp' };
  }
  return null;
}

@Injectable()
export class UploadImageUseCase {
  constructor(@Inject(FILE_STORAGE) private readonly fileStorage: IFileStorage) {}

  async execute(file: UploadImageInput | undefined, folder: UploadFolder): Promise<string> {
    if (!file || file.size === 0) {
      throw new BadRequestException('Vui lòng chọn ảnh cần tải lên');
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw new PayloadTooLargeException(MAX_IMAGE_SIZE_MESSAGE);
    }

    const type = detectImageType(file.buffer);
    if (!type) {
      throw new BadRequestException('Chỉ chấp nhận ảnh định dạng JPG, PNG hoặc WEBP');
    }

    const key = `${folder}/${randomUUID()}.${type.ext}`;
    return this.fileStorage.upload(key, file.buffer, type.contentType);
  }
}
