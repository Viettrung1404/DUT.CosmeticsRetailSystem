const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isolatedEnv, testDatabaseUrl } = require('./readiness-env.cjs');

test('refuses remote, shared, or unscoped databases before running any command', () => {
  for (const value of [
    'postgresql://test:password@remote.example:55434/glowup_readiness_test?schema=readiness_x',
    'postgresql://test:password@127.0.0.1:55434/production?schema=readiness_x',
    'postgresql://test:password@127.0.0.1:55434/glowup_readiness_test',
    'postgresql://test:password@127.0.0.1:55434/glowup_readiness_test?schema=public',
    'postgresql://test:password@127.0.0.1:55434/glowup_readiness_test?schema=readiness_x&host=remote.example',
    'postgresql://test:password@127.0.0.1:55434/glowup_readiness_test?schema=readiness_x&schema=public',
  ]) assert.throws(() => testDatabaseUrl(value));
});

test('accepts only the dedicated readiness database and allowed test schemas', () => {
  const value = 'postgresql://test:password@127.0.0.1:55434/glowup_readiness_test?schema=readiness_a1&connection_limit=10';
  assert.equal(testDatabaseUrl(value), value);
  assert.equal(testDatabaseUrl(value.replace('schema=readiness_a1', 'schema=sprint6_benchmark_readiness_a1')),
    value.replace('schema=readiness_a1', 'schema=sprint6_benchmark_readiness_a1'));
});

test('does not inherit developer credentials and shadows every dotenv key', () => {
  const inherited = { PATH: 'system-path', SystemRoot: 'C:/Windows', DATABASE_URL: 'private', SEPAY_API_TOKEN: 'private', CUSTOM_PROVIDER_KEY: 'private' };
  const env = isolatedEnv(inherited, ['DATABASE_URL', 'SEPAY_API_TOKEN', 'CUSTOM_PROVIDER_KEY', 'JWT_REFRESH_EXPIRES_IN']);
  assert.equal(env.PATH, 'system-path');
  assert.equal(env.SystemRoot, 'C:/Windows');
  assert.equal(env.SEPAY_API_TOKEN, '');
  assert.equal(env.CUSTOM_PROVIDER_KEY, '');
  assert.equal(env.JWT_REFRESH_EXPIRES_IN, '7d');
  assert.equal(env.NODE_ENV, 'test');
  assert.equal(env.NOTIFICATION_DELIVERY_ENABLED, 'false');
  assert.equal(env.PAYMENT_WORKER_ENABLED, 'false');
  assert.ok(!Object.values(env).includes('private'));
  assert.equal(inherited.DATABASE_URL, 'private');
});
