import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Observable, catchError, throwError } from 'rxjs';
import { MAX_IMAGE_SIZE_MESSAGE } from '../../application/use-cases/upload-image.use-case';

// Multer báo lỗi bằng tiếng Anh ("File too large", "Unexpected field"...), đổi sang tiếng Việt theo NFR-08
@Injectable()
export class UploadErrorInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((error) => {
        if (error instanceof PayloadTooLargeException) {
          return throwError(() => new PayloadTooLargeException(MAX_IMAGE_SIZE_MESSAGE));
        }
        if (error instanceof BadRequestException && isMulterMessage(error.message)) {
          return throwError(
            () => new BadRequestException('Gửi đúng một ảnh trong trường "file" (multipart/form-data)'),
          );
        }
        return throwError(() => error);
      }),
    );
  }
}

function isMulterMessage(message: string): boolean {
  return (
    message.startsWith('Multipart:') ||
    ['Unexpected field', 'Too many files', 'Too many parts'].includes(message)
  );
}
