import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Observable, catchError, throwError } from 'rxjs';

// Multer báo lỗi bằng tiếng Anh, đổi sang tiếng Việt theo NFR-08
@Injectable()
export class CsvUploadErrorInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((error) => {
        if (error instanceof PayloadTooLargeException) {
          return throwError(() => new PayloadTooLargeException('File nhập tối đa 2 MB'));
        }
        if (
          error instanceof BadRequestException &&
          (error.message.startsWith('Multipart:') ||
            ['Unexpected field', 'Too many files', 'Too many parts'].includes(error.message))
        ) {
          return throwError(
            () => new BadRequestException('Gửi đúng một file Excel hoặc CSV trong trường "file" (multipart/form-data)'),
          );
        }
        return throwError(() => error);
      }),
    );
  }
}
