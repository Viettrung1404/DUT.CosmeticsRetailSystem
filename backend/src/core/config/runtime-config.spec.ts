import { ConfigService } from '@nestjs/config';
import { corsOptions, validateRuntimeConfig, webOrigin } from './runtime-config';
describe('Runtime deployment configuration', () => {
  it('requires a JWT secret in all environments', () => {
    expect(() => validateRuntimeConfig({})).toThrow('JWT_SECRET');
  });
  it('fails production startup for weak/default secrets, missing origins or missing distributed limit store', () => {
    const env = {
      NODE_ENV: 'production',
      JWT_SECRET: 'x'.repeat(64),
      CORS_ALLOWED_ORIGINS: 'https://shop.example.test',
      PUBLIC_WEB_URL: 'https://shop.example.test',
      UPSTASH_REDIS_REST_URL: 'https://test.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'test',
    };
    expect(validateRuntimeConfig(env)).toBe(env);
    for (const JWT_SECRET of ['short', 'super_secret_jwt_key_glowup_cosmetics_retail_system_2026'])
      expect(() => validateRuntimeConfig({ ...env, JWT_SECRET })).toThrow();
    expect(() => validateRuntimeConfig({ ...env, CORS_ALLOWED_ORIGINS: '' })).toThrow(
      'CORS_ALLOWED_ORIGINS',
    );
    expect(() => validateRuntimeConfig({ ...env, UPSTASH_REDIS_REST_TOKEN: '' })).toThrow(
      'Upstash',
    );
  });
  it('rejects untrusted URL forms and never reflects arbitrary CORS origins', () => {
    for (const url of [
      'https://user:pass@example.test',
      'https://example.test/path',
      'https://example.test?x=1',
      'javascript:alert(1)',
      'https://example.test/#fragment',
    ])
      expect(() => webOrigin(url)).toThrow();
    expect(
      corsOptions(
        new ConfigService({
          CORS_ALLOWED_ORIGINS: 'https://web.example.test, https://admin.example.test',
        }),
      ).origin,
    ).toEqual(['https://web.example.test', 'https://admin.example.test']);
  });
  it('validates refresh lifetime bounds at startup', () => {
    for (const value of ['0d', '366d', '-1h', 'invalid', '999999999999999999999d'])
      expect(() =>
        validateRuntimeConfig({ JWT_SECRET: 'test', JWT_REFRESH_EXPIRES_IN: value }),
      ).toThrow('JWT_REFRESH_EXPIRES_IN');
    expect(
      validateRuntimeConfig({ JWT_SECRET: 'test', JWT_REFRESH_EXPIRES_IN: '30d' }),
    ).toBeDefined();
  });
});
