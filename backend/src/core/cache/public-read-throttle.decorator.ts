import { applyDecorators, SetMetadata } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

export const PUBLIC_READ_POLICY = 'publicReadThrottlePolicy';
export type PublicReadPolicy = 'reference' | 'catalog' | 'search';

// Explicit risk groups, preserving existing limits and handler/IP isolation.
// Memory/Redis choice remains in TieredThrottlerGuard, including its Redis opt-in.
export function PublicReadThrottle(policy: PublicReadPolicy) {
  return applyDecorators(
    SetMetadata(PUBLIC_READ_POLICY, policy),
    Throttle({ default: { limit: policy === 'search' ? 30 : 100, ttl: 60_000 } }),
  );
}
