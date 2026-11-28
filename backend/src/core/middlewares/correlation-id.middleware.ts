import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { runWithCorrelationContext } from '../logger/correlation-context';

export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const REQUEST_ID_HEADER = 'x-request-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // 1. Trích xuất Correlation ID từ header hoặc sinh UUID v4 mới
    const rawHeader =
      req.headers[CORRELATION_ID_HEADER] ||
      req.headers[REQUEST_ID_HEADER];

    const correlationId =
      typeof rawHeader === 'string' && rawHeader.trim().length > 0
        ? rawHeader.trim()
        : Array.isArray(rawHeader) && rawHeader.length > 0 && rawHeader[0].trim().length > 0
        ? rawHeader[0].trim()
        : randomUUID();

    // 2. Gắn ngược lại vào request object và request headers
    req.headers[CORRELATION_ID_HEADER] = correlationId;
    (req as any).correlationId = correlationId;

    // 3. Thiết lập Correlation ID vào HTTP Response header để Client / Gateway có thể đối soát
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    // 4. Chạy middleware tiếp theo trong phạm vi ngữ cảnh AsyncLocalStorage
    runWithCorrelationContext(correlationId, () => {
      next();
    });
  }
}
