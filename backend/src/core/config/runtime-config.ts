import { ConfigService } from '@nestjs/config';

export function validateRuntimeConfig(env: Record<string, unknown>) {
  if (!String(env.JWT_SECRET ?? '').trim()) throw new Error('JWT_SECRET is required');
  if (env.JWT_REFRESH_EXPIRES_IN !== undefined) refreshTokenTtl(String(env.JWT_REFRESH_EXPIRES_IN));
  redisCommandTimeout(env.UPSTASH_REDIS_TIMEOUT_MS);
  if (env.NODE_ENV === 'production') {
    if (
      String(env.JWT_SECRET).length < 32 ||
      /super_secret|glowup-secret/.test(String(env.JWT_SECRET))
    )
      throw new Error('Production JWT_SECRET must be a strong secret of at least 32 characters');
    if (!env.CORS_ALLOWED_ORIGINS)
      throw new Error('CORS_ALLOWED_ORIGINS is required in production');
    if (!env.PUBLIC_WEB_URL) throw new Error('PUBLIC_WEB_URL is required in production');
    if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN)
      throw new Error('Distributed rate limiting requires Upstash in production');
  }
  if (env.PUBLIC_WEB_URL) webOrigin(String(env.PUBLIC_WEB_URL), env.NODE_ENV === 'production');
  for (const origin of String(env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .filter(Boolean))
    webOrigin(origin.trim(), env.NODE_ENV === 'production');
  return env;
}

export function webOrigin(value: string, production = false) {
  const url = new URL(value);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    (production && url.protocol !== 'https:') ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw new Error('Expected an HTTP(S) origin without credentials, path, query or fragment');
  return url.origin;
}

export function corsOptions(config: ConfigService) {
  const origins = String(
    config.get('CORS_ALLOWED_ORIGINS', 'http://localhost:3001,http://127.0.0.1:3001'),
  )
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  return { origin: origins, credentials: true, exposedHeaders: ['Retry-After', 'ETag'] };
}

export function refreshTokenTtl(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const ttl = match ? Number(match[1]) * unit[match[2] as keyof typeof unit] : 0;
  if (!Number.isSafeInteger(ttl) || ttl <= 0 || ttl > 365 * 86400000)
    throw new Error('JWT_REFRESH_EXPIRES_IN must be between 1s and 365d');
  return ttl;
}

export function redisCommandTimeout(value: unknown = 4000): number {
  const timeout = Number(value);
  if (!Number.isInteger(timeout) || timeout < 100 || timeout > 10000)
    throw new Error(
      'UPSTASH_REDIS_TIMEOUT_MS must be an integer between 100 and 10000',
    );
  return timeout;
}
