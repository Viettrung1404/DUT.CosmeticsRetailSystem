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
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse &&
        'code' in exceptionResponse
      ) {
        code = String(exceptionResponse['code']);
        if ('min' in exceptionResponse && 'max' in exceptionResponse)
          details = {
            min: exceptionResponse['min'],
            max: exceptionResponse['max'],
          };
      }
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
      message = 'Internal server error';
    }

    const formattedMessage = Array.isArray(message)
      ? message.join(', ')
      : message;

    // Body-parser and validation failures occur before the callback controller.
    // Preserve native protocols on these routes as well.
    const path = request.path.replace(/\/$/, '');
    if (path.endsWith('/payments/momo/ipn'))
      return response.status(status >= 500 ? 503 : 400).end();
    if (path.endsWith('/payments/zalopay/callback'))
      return status >= 500
        ? response.status(503).end()
        : response
            .status(200)
            .json({ return_code: 2, return_message: 'Thất bại' });
    if (path.endsWith('/payments/vnpay/ipn'))
      return response.status(200).json({
        RspCode: status >= 500 ? '99' : '97',
        Message: 'Callback rejected',
      });

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
      ...(details ? { details } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
