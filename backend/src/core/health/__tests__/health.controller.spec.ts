import { HealthController } from '../health.module';

describe('HealthController', () => {
  it('keeps /health/live strictly process-only without querying DB or Redis', () => {
    const db = { $queryRaw: jest.fn() } as any;
    const redis = { configured: true, command: jest.fn() } as any;
    const config = { get: jest.fn() } as any;

    const controller = new HealthController(db, redis, config);

    expect(controller.live()).toEqual({ status: 'ok' });
    expect(db.$queryRaw).not.toHaveBeenCalled();
    expect(redis.command).not.toHaveBeenCalled();
  });
});
