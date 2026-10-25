import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';
    let code: string | undefined;
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse &&
        'code' in exceptionResponse
      )
        code = String(exceptionResponse.code);
      if (code === 'ORDER_PRICE_CHANGED' && typeof exceptionResponse === 'object') {
        const changed = exceptionResponse as { pricing?: unknown; quoteVersion?: unknown };
        details = { pricing: changed.pricing, quoteVersion: changed.quoteVersion };
      }
      message =
        typeof exceptionResponse === 'object' && 'message' in exceptionResponse
          ? (exceptionResponse as any).message
          : exceptionResponse;
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled Error: ${exception.message}`,
        exception.stack,
      );
    }

    const formattedMessage = Array.isArray(message)
      ? message.join(', ')
      : message;

    response.status(status).json({
      statusCode: status,
      success: false,
      message: formattedMessage,
      ...(code
        ? { code }
        : typeof formattedMessage === 'string' &&
            /^[A-Z][A-Z0-9_]+$/.test(formattedMessage)
          ? { code: formattedMessage }
          : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
      ...(details ? { details } : {}),
    });
  }
}
