import { ConfigService } from '@nestjs/config';
import { DistributedThrottlerStorage, THROTTLE_SCRIPT } from '../distributed-throttler.storage';
describe('Distributed throttler storage', () => {
  it('uses atomic Redis script, same keys across instances and millisecond-to-second expiry conversion', async () => {
    const command = jest.fn().mockResolvedValue([6, 12500, 8000]);
    const redis = { configured: true, command };
    const config = new ConfigService({ REDIS_KEY_PREFIX: 'unit:s6:' });
    const a = new DistributedThrottlerStorage(redis as any, config),
      b = new DistributedThrottlerStorage(redis as any, config);
    const result = await a.increment('user-private-value', 60000, 5, 8000, 'default');
    await b.increment('user-private-value', 60000, 5, 8000, 'default');
    expect(result).toEqual({
      totalHits: 6,
      timeToExpire: 13,
      isBlocked: true,
      timeToBlockExpire: 8,
    });
    expect(command.mock.calls[0]).toEqual(command.mock.calls[1]);
    expect(command.mock.calls[0][0]).toEqual([
      'EVAL',
      THROTTLE_SCRIPT,
      2,
      expect.stringMatching(/^unit:s6:throttle:\{[a-f0-9]+\}$/),
      expect.stringMatching(/:block$/),
      60000,
      5,
      8000,
    ]);
    expect(command.mock.calls[0][0][3]).not.toContain('user-private-value');
  });
  it('does not silently fall back when Redis fails or production has no distributed store', async () => {
    const config = {
      get: (key: string) => (key === 'NODE_ENV' ? 'production' : undefined),
    } as ConfigService;
    await expect(
      new DistributedThrottlerStorage({ configured: false } as any, config).increment(
        'a',
        1000,
        1,
        1000,
        'default',
      ),
    ).rejects.toThrow('RATE_LIMIT_STORE_REQUIRED');
    await expect(
      new DistributedThrottlerStorage(
        {
          configured: true,
          command: jest.fn().mockRejectedValue(new Error('redis down')),
        } as any,
        config,
      ).increment('a', 1000, 1, 1000, 'default'),
    ).rejects.toThrow('redis down');
  });
});
