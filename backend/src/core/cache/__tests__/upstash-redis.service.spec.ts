import { ConfigService } from '@nestjs/config';
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
  afterEach(() => {
    global.fetch = original;
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
});
