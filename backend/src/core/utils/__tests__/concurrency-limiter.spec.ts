import { ConcurrencyLimiter } from '../concurrency-limiter';
describe('Bounded work', () => {
  it('limits concurrent jobs and releases the slot after rejection', async () => {
    const limiter = new ConcurrencyLimiter(2);
    let running = 0;
    let peak = 0;
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, (_, i) =>
        limiter.run(async () => {
          running++;
          peak = Math.max(peak, running);
          await new Promise((r) => setTimeout(r, 2));
          running--;
          if (i === 0) throw new Error('Task failed');
          return i;
        }),
      ),
    );
    expect(peak).toBe(2);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(running).toBe(0);
  });
});
