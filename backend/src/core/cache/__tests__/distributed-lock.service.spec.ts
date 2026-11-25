import {
  DistributedLockService,
  EXTEND_LOCK_SCRIPT,
  RELEASE_LOCK_SCRIPT,
} from '../distributed-lock.service';

describe('DistributedLockService', () => {
  it('acquires lock via SET NX EX and releases safely via Lua compare-and-delete', async () => {
    const command = jest
      .fn()
      .mockResolvedValueOnce('OK')
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);

    const redis = {
      configured: true,
      keyPrefix: 'unit:',
      command,
    } as any;

    const locks = new DistributedLockService(redis);
    const handle = await locks.acquire('rec:similar', 600);

    expect(handle).not.toBeNull();
    expect(handle!.backend).toBe('redis');
    expect(handle!.key).toBe('unit:lock:rec:similar');
    expect(command).toHaveBeenNthCalledWith(1, [
      'SET',
      'unit:lock:rec:similar',
      handle!.token,
      'NX',
      'EX',
      600,
    ]);

    expect(await handle!.extend(900)).toBe(true);
    expect(command).toHaveBeenNthCalledWith(2, [
      'EVAL',
      EXTEND_LOCK_SCRIPT,
      1,
      'unit:lock:rec:similar',
      handle!.token,
      900,
    ]);

    expect(await handle!.release()).toBe(true);
    expect(command).toHaveBeenNthCalledWith(3, [
      'EVAL',
      RELEASE_LOCK_SCRIPT,
      1,
      'unit:lock:rec:similar',
      handle!.token,
    ]);
  });

  it('returns null when lock is already held and runs withLock() safely', async () => {
    const command = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('OK')
      .mockResolvedValueOnce(1);

    const redis = {
      configured: true,
      keyPrefix: 'unit:',
      command,
    } as any;

    const locks = new DistributedLockService(redis);

    const skipped = await locks.withLock('rec:trending', 600, async () => 'nope');
    expect(skipped).toEqual({ acquired: false });

    await expect(
      locks.withLock('rec:trending', 600, async () => {
        throw new Error('job failed');
      }),
    ).rejects.toThrow('job failed');

    // Release was still invoked in finally
    expect(command).toHaveBeenCalledTimes(3);
    expect(command.mock.calls[2][0][0]).toBe('EVAL');
  });

  it('uses in-memory lock when Redis is unconfigured or unavailable (unless strict)', async () => {
    const unconfigured = new DistributedLockService({
      configured: false,
      keyPrefix: 'unit:',
    } as any);

    const h1 = await unconfigured.acquire('rec:affinities', 60);
    const h2 = await unconfigured.acquire('rec:affinities', 60);
    expect(h1?.backend).toBe('memory');
    expect(h2).toBeNull();
    expect(await h1!.release()).toBe(true);
    expect(await unconfigured.acquire('rec:affinities', 60)).not.toBeNull();

    const failingRedis = new DistributedLockService({
      configured: true,
      keyPrefix: 'unit:',
      command: jest.fn().mockRejectedValue(new Error('REDIS_UNAVAILABLE')),
    } as any);

    const fallbackHandle = await failingRedis.acquire('rec:cleanup', 60);
    expect(fallbackHandle?.backend).toBe('memory');

    await expect(
      failingRedis.acquire('rec:cleanup', 60, { strict: true }),
    ).rejects.toThrow('REDIS_UNAVAILABLE');
  });
});
