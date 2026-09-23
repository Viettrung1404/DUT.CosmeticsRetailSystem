import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseDto } from '../common/api-response.dto';

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponseDto<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponseDto<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode || 200;

    return next.handle().pipe(
      map((data) => {
        // If data is already formatted or has custom message
        if (data && typeof data === 'object' && 'message' in data && 'data' in data) {
          return new ApiResponseDto(statusCode, true, data.message, data.data);
        }

        return new ApiResponseDto(
          statusCode,
          true,
          'Thao tác thành công',
          data,
        );
      }),
    );
  }
}
