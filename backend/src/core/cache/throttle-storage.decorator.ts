import { SetMetadata } from '@nestjs/common';

export const THROTTLE_STORAGE_MODE_KEY = 'throttleStorageMode';
export type ThrottleStorageMode = 'memory' | 'redis';

/**
 * Forces in-memory throttling (0 Upstash Redis commands) for lightweight public read endpoints.
 */
export const UseInMemoryThrottle = () =>
  SetMetadata(THROTTLE_STORAGE_MODE_KEY, 'memory' satisfies ThrottleStorageMode);

/**
 * Forces distributed Upstash Redis throttling for sensitive endpoints (Auth, OTP, Checkout, Payment).
 */
export const UseDistributedThrottle = () =>
  SetMetadata(THROTTLE_STORAGE_MODE_KEY, 'redis' satisfies ThrottleStorageMode);
