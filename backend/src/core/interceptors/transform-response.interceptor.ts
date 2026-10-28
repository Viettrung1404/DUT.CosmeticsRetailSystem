import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseDto } from '../common/api-response.dto';
import { Reflector } from '@nestjs/core';
import { RAW_RESPONSE } from '../decorators/raw-response.decorator';

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, ApiResponseDto<T>> {
  constructor(private readonly reflector = new Reflector()) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponseDto<T>> {
    if (this.reflector.getAllAndOverride(RAW_RESPONSE, [context.getHandler(), context.getClass()]))
      return next.handle();
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();

    return next.handle().pipe(
      map((data) => {
        const statusCode = response.statusCode || 200;
        // If data is already formatted or has custom message
        if (
          data &&
          typeof data === 'object' &&
          'message' in data &&
          'data' in data
        ) {
          return new ApiResponseDto(statusCode, true, data.message, data.data);
        }

        return new ApiResponseDto(statusCode, true, 'Thao tác thành công', data);
      }),
    );
  }
}
