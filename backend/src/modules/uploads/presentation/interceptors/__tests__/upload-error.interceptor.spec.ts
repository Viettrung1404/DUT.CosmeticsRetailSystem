import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { lastValueFrom, throwError } from 'rxjs';
import { UploadErrorInterceptor } from '../upload-error.interceptor';

const run = (error: Error) => {
  const next: CallHandler = { handle: () => throwError(() => error) };
  return lastValueFrom(new UploadErrorInterceptor().intercept({} as ExecutionContext, next));
};

describe('UploadErrorInterceptor', () => {
  it('đổi "File too large" của multer sang tiếng Việt, giữ mã 413', async () => {
    await expect(run(new PayloadTooLargeException('File too large'))).rejects.toMatchObject({
      message: 'Ảnh vượt quá dung lượng cho phép (tối đa 5 MB)',
      status: 413,
    });
  });

  it.each(['Unexpected field', 'Too many files', 'Multipart: Boundary not found'])(
    'đổi lỗi multer "%s" sang tiếng Việt',
    async (message) => {
      await expect(run(new BadRequestException(message))).rejects.toThrow(
        'Gửi đúng một ảnh trong trường "file" (multipart/form-data)',
      );
    },
  );

  it('giữ nguyên các lỗi khác', async () => {
    const validation = new BadRequestException('folder phải là một trong: products, brands, categories');
    const notFound = new NotFoundException('x');

    await expect(run(validation)).rejects.toBe(validation);
    await expect(run(notFound)).rejects.toBe(notFound);
  });
});
