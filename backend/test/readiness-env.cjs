const { URL } = require('node:url');

function testDatabaseUrl(value) {
  const url = new URL(value);
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['127.0.0.1', 'localhost'].includes(url.hostname) ||
    url.port !== '55434' ||
    url.pathname !== '/glowup_readiness_test' ||
    !/^(readiness_|sprint[456]_readiness_|sprint6_benchmark_readiness_)[a-z0-9_]+$/.test(url.searchParams.get('schema') || '') ||
    [...url.searchParams.keys()].some((key) => !['schema', 'connection_limit'].includes(key)) ||
    [...url.searchParams.keys()].some((key) => url.searchParams.getAll(key).length !== 1)
  ) throw new Error('Readiness requires localhost:55434/glowup_readiness_test and a dedicated test schema');
  return value;
}

function isolatedEnv(inherited, dotenvKeys) {
  const env = {};
  const systemKeys = /^(path|pathext|systemroot|windir|comspec|temp|tmp|userprofile|appdata|localappdata|programfiles|programfiles\(x86\)|programdata|home|lang|lc_all)$/i;
  for (const [key, value] of Object.entries(inherited)) {
    if (systemKeys.test(key)) env[key] = value;
  }
  // Nest loads .env at module import time: empty values must shadow its keys.
  // The values in that file are never copied into the child environment.
  for (const key of dotenvKeys) if (!systemKeys.test(key)) env[key] = '';
  Object.assign(env, {
    NODE_ENV: 'test', PORT: '3300', API_PREFIX: 'api/v1',
    JWT_SECRET: 'readiness-local-only-secret-not-for-deployment',
    JWT_REFRESH_SECRET: 'readiness-local-only-refresh-secret',
    JWT_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN: '7d',
    UPSTASH_REDIS_TIMEOUT_MS: '4000',
    NOTIFICATION_DELIVERY_ENABLED: 'false', EMAIL_OUTBOX_ENABLED: 'false',
    PAYMENT_WORKER_ENABLED: 'false', CATALOG_INDEX_WORKER_ENABLED: 'false',
    BROADCAST_WORKER_ENABLED: 'false', PRISMA_LOG_QUERIES: 'false',
    SEPAY_ENABLED: 'false', VNPAY_ENABLED: 'false', MOMO_ENABLED: 'false', ZALOPAY_ENABLED: 'false',
    SEPAY_MODE: 'sandbox', PUBLIC_WEB_URL: 'http://localhost:3301',
    CORS_ALLOWED_ORIGINS: 'http://localhost:3301',
    FORCE_COLOR: '0',
  });
  return env;
}

module.exports = { testDatabaseUrl, isolatedEnv };
