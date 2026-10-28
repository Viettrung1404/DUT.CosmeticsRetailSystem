import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { UpstashRedisService } from '../upstash-redis.service';
describe('Upstash cache and distributed rate limiting', () => {
  const original = global.fetch;
  const service = () =>
    new UpstashRedisService(
      new ConfigService({
        UPSTASH_REDIS_REST_URL: 'https://test.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 'test-token',
        REDIS_KEY_PREFIX: 'unit:',
      }),
    );
  beforeEach(() =>
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {}),
  );
  afterEach(() => {
    global.fetch = original;
    jest.restoreAllMocks();
  });
  it('sends JSON commands using bearer auth and explicit TTL', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ result: null }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: 'OK' }),
      });
    global.fetch = fetchMock;
    await service().set('catalog', { price: 123 }, 500);
    const options = fetchMock.mock.calls[1][1];
    expect(JSON.parse(options.body)).toEqual([
      'SET',
      'unit:cache:0:catalog',
      '{"price":123}',
      'PX',
      500,
    ]);
    expect(options.headers.Authorization).toBe('Bearer test-token');
    expect(options.redirect).toBe('error');
  });
  it('treats cache failure as a miss but refuses to bypass rate limits on Redis outage', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('network token-secret'));
    await expect(service().get('a')).resolves.toBeNull();
    await expect(service().rateLimit('user', 10, 60000)).rejects.toThrow(
      'REDIS_UNAVAILABLE',
    );
  });
  it('uses an atomic Lua increment+expiry and hashed identities', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ result: 11 }) });
    global.fetch = fetchMock;
    expect(await service().rateLimit('customer-private-id', 10, 60000)).toBe(
      false,
    );
    const command = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(command[0]).toBe('EVAL');
    expect(command[3]).not.toContain('customer-private-id');
    expect(command[1]).toContain('PEXPIRE');
  });
  it('uses a configurable bounded timeout and does not replay an uncertain command', async () => {
    const timeout = jest.spyOn(AbortSignal, 'timeout');
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('network token-secret'));
    const redis = new UpstashRedisService(
      new ConfigService({
        UPSTASH_REDIS_REST_URL: 'https://test.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 'secret',
        UPSTASH_REDIS_TIMEOUT_MS: '3500',
      }),
    );
    await expect(redis.rateLimit('private-key', 10, 60000)).rejects.toThrow(
      'REDIS_UNAVAILABLE',
    );
    expect(timeout).toHaveBeenCalledWith(3500);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(Logger.prototype.warn).toHaveBeenCalledWith({
      event: 'redis_command_failed',
      reason: 'network',
    });
  });
  it('distinguishes provider HTTP failures without exposing the provider body', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 });
    await expect(service().command(['PING'])).rejects.toThrow(
      'REDIS_UNAVAILABLE',
    );
    expect(Logger.prototype.warn).toHaveBeenCalledWith({
      event: 'redis_command_failed',
      reason: 'http_429',
    });
  });
});
