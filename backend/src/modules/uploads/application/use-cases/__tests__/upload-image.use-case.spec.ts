import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { IFileStorage } from '../../ports/file-storage.port';
import { MAX_IMAGE_SIZE, UploadImageUseCase } from '../upload-image.use-case';

const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBPVP8 ')]);
const GIF = Buffer.from('GIF89a......');

const fileOf = (buffer: Buffer, size = buffer.length) => ({ buffer, size });

describe('UploadImageUseCase', () => {
  let storage: jest.Mocked<IFileStorage>;
  let useCase: UploadImageUseCase;

  beforeEach(() => {
    storage = {
      upload: jest.fn<Promise<string>, [string, Buffer, string]>((key) =>
        Promise.resolve(`https://cdn.test/${key}`),
      ),
    };
    useCase = new UploadImageUseCase(storage);
  });

  it.each([
    ['jpg', JPG, 'image/jpeg'],
    ['png', PNG, 'image/png'],
    ['webp', WEBP, 'image/webp'],
  ])('nhận ảnh %s, đặt tên UUID trong đúng thư mục và trả về link', async (ext, buffer, contentType) => {
    const url = await useCase.execute(fileOf(buffer), 'products');

    const [key, body, type] = storage.upload.mock.calls[0];
    expect(key).toMatch(new RegExp(`^products/[0-9a-f-]{36}\\.${ext}$`));
    expect(body).toBe(buffer);
    expect(type).toBe(contentType);
    expect(url).toBe(`https://cdn.test/${key}`);
  });

  it('hai lần upload cùng một ảnh cho ra hai tên file khác nhau', async () => {
    await useCase.execute(fileOf(PNG), 'brands');
    await useCase.execute(fileOf(PNG), 'brands');

    expect(storage.upload.mock.calls[0][0]).not.toBe(storage.upload.mock.calls[1][0]);
  });

  it('báo 400 khi không gửi file hoặc file rỗng', async () => {
    await expect(useCase.execute(undefined, 'products')).rejects.toThrow(BadRequestException);
    await expect(useCase.execute(fileOf(Buffer.alloc(0)), 'products')).rejects.toThrow(
      BadRequestException,
    );
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('báo 413 khi ảnh vượt quá 5 MB', async () => {
    await expect(useCase.execute(fileOf(JPG, MAX_IMAGE_SIZE + 1), 'products')).rejects.toThrow(
      PayloadTooLargeException,
    );
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('chặn file không phải JPG/PNG/WEBP dù client khai là ảnh', async () => {
    await expect(useCase.execute(fileOf(GIF), 'products')).rejects.toThrow(
      'Chỉ chấp nhận ảnh định dạng JPG, PNG hoặc WEBP',
    );
    await expect(useCase.execute(fileOf(Buffer.from('<script>')), 'products')).rejects.toThrow(
      BadRequestException,
    );
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('để lỗi của kho lưu ảnh đi tiếp ra ngoài', async () => {
    storage.upload.mockRejectedValue(new Error('network'));

    await expect(useCase.execute(fileOf(JPG), 'categories')).rejects.toThrow('network');
  });
});
