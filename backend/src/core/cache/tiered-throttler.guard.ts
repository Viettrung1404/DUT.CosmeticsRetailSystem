import { ExecutionContext, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerStorage,
  ThrottlerLimitDetail,
} from '@nestjs/throttler';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IN_MEMORY_KEY_PREFIX } from './distributed-throttler.storage';
import { PUBLIC_READ_POLICY } from './public-read-throttle.decorator';
import {
  THROTTLE_STORAGE_MODE_KEY,
  ThrottleStorageMode,
} from './throttle-storage.decorator';

const SENSITIVE_PATH_PATTERN =
  /(^|\/)(auth|otp|checkout|orders|payments|guest|cart|uploads|webhooks|internal)(\/|$)/i;

@Injectable()
export class TieredThrottlerGuard extends ThrottlerGuard {
  protected override async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    // No query strings, client IPs, credentials or response payloads in diagnostics.
    this.logger.warn({
      event: 'rate_limit_exceeded',
      controller: context.getClass().name,
      handler: context.getHandler().name,
      policy: this.reflector.getAllAndOverride(PUBLIC_READ_POLICY, [
        context.getHandler(), context.getClass(),
      ]) ?? 'default-or-sensitive',
      storage: this.resolveStorageMode(context),
      limit: detail.limit,
      windowMs: detail.ttl,
      retryAfterSeconds: detail.timeToBlockExpire,
    });
    return super.throwThrottlingException(context, detail);
  }

  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
    @Optional() private readonly config?: ConfigService,
  ) {
    super(options, storageService, reflector);
  }

  resolveStorageMode(context: ExecutionContext): ThrottleStorageMode {
    const handler = context.getHandler();
    const classRef = context.getClass();

    const explicit = this.reflector.getAllAndOverride<ThrottleStorageMode>(
      THROTTLE_STORAGE_MODE_KEY,
      [handler, classRef],
    );
    if (explicit === 'memory' || explicit === 'redis') {
      return explicit;
    }

    const publicGetInMemoryEnabled =
      this.config?.get<string>('THROTTLE_PUBLIC_GET_IN_MEMORY', 'true') !==
      'false';
    if (!publicGetInMemoryEnabled) {
      return 'redis';
    }

    const isPublic =
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        handler,
        classRef,
      ]) === true;
    if (!isPublic) {
      return 'redis';
    }

    const req = context.switchToHttp().getRequest<{
      method?: string;
      path?: string;
      originalUrl?: string;
      url?: string;
    }>();
    const method = (req?.method ?? '').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      return 'redis';
    }

    const requestPath = req?.path || req?.originalUrl || req?.url || '';
    if (SENSITIVE_PATH_PATTERN.test(requestPath)) {
      return 'redis';
    }

    return 'memory';
  }

  protected override generateKey(
    context: ExecutionContext,
    suffix: string,
    name: string,
  ): string {
    const baseKey = super.generateKey(context, suffix, name);
    return this.resolveStorageMode(context) === 'memory'
      ? `${IN_MEMORY_KEY_PREFIX}${baseKey}`
      : baseKey;
  }
}
