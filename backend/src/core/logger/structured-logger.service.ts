import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { getCorrelationId } from './correlation-context';

export interface StructuredLogEntry {
  timestamp: string;
  level: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG' | 'VERBOSE';
  context?: string;
  message: string;
  correlationId?: string;
  stack?: string;
  data?: any;
}

@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLoggerService implements LoggerService {
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  setContext(context: string): void {
    this.context = context;
  }

  log(message: any, ...optionalParams: any[]): void {
    this.printLog('INFO', message, optionalParams);
  }

  error(message: any, ...optionalParams: any[]): void {
    this.printLog('ERROR', message, optionalParams);
  }

  warn(message: any, ...optionalParams: any[]): void {
    this.printLog('WARN', message, optionalParams);
  }

  debug(message: any, ...optionalParams: any[]): void {
    this.printLog('DEBUG', message, optionalParams);
  }

  verbose(message: any, ...optionalParams: any[]): void {
    this.printLog('VERBOSE', message, optionalParams);
  }

  /**
   * Tạo bản ghi log có cấu trúc (Structured Log Entry)
   */
  formatEntry(
    level: StructuredLogEntry['level'],
    message: any,
    optionalParams: any[],
  ): StructuredLogEntry {
    const correlationId = getCorrelationId();
    let resolvedContext = this.context;
    let stack: string | undefined;
    let data: any = undefined;

    // Phân tích các tham số bổ sung từ NestJS Logger
    if (optionalParams.length > 0) {
      const lastParam = optionalParams[optionalParams.length - 1];
      if (typeof lastParam === 'string' && optionalParams.length <= 2) {
        resolvedContext = lastParam;
      }

      if (level === 'ERROR' && optionalParams[0] instanceof Error) {
        stack = optionalParams[0].stack;
        data = { errorName: optionalParams[0].name, details: optionalParams[0].message };
      } else if (level === 'ERROR' && typeof optionalParams[0] === 'string' && optionalParams[0].includes('\n')) {
        stack = optionalParams[0];
      } else {
        const nonContextParams = optionalParams.filter(
          (p) => typeof p !== 'string' || p !== resolvedContext,
        );
        if (nonContextParams.length === 1) {
          data = nonContextParams[0];
        } else if (nonContextParams.length > 1) {
          data = nonContextParams;
        }
      }
    }

    const resolvedMessage =
      typeof message === 'object' && message !== null
        ? JSON.stringify(message)
        : String(message);

    return {
      timestamp: new Date().toISOString(),
      level,
      context: resolvedContext || 'Application',
      message: resolvedMessage,
      correlationId: correlationId || undefined,
      stack,
      data,
    };
  }

  private printLog(
    level: StructuredLogEntry['level'],
    message: any,
    optionalParams: any[],
  ): void {
    const entry = this.formatEntry(level, message, optionalParams);
    const jsonString = JSON.stringify(entry);

    if (level === 'ERROR') {
      process.stderr.write(jsonString + '\n');
    } else {
      process.stdout.write(jsonString + '\n');
    }
  }
}
