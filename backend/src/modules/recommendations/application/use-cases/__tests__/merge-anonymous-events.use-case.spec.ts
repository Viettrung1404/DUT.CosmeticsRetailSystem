import { randomUUID } from 'crypto';
import { RecommendationRepository } from '../../../infrastructure/recommendation.repository';
import { MergeAnonymousEventsUseCase } from '../merge-anonymous-events.use-case';

describe('MergeAnonymousEventsUseCase', () => {
  let mockRepository: {
    mergeAnonymousEventsToCustomer: jest.Mock;
    findCustomerIdByUserId: jest.Mock;
  };
  let useCase: MergeAnonymousEventsUseCase;

  beforeEach(() => {
    mockRepository = {
      mergeAnonymousEventsToCustomer: jest.fn().mockResolvedValue(3),
      findCustomerIdByUserId: jest.fn(),
    };
    useCase = new MergeAnonymousEventsUseCase(mockRepository as any);
  });

  it('merges only events where customer_id IS NULL and created within 30 days', async () => {
    const customerId = randomUUID();
    const anonymousId = randomUUID();

    const merged = await useCase.execute({ customerId, anonymousId });

    expect(merged).toBe(3);
    expect(mockRepository.mergeAnonymousEventsToCustomer).toHaveBeenCalledWith(
      customerId,
      anonymousId,
    );
  });

  it('skips DB call when anonymousId or customerId is missing/invalid', async () => {
    expect(
      await useCase.execute({ customerId: randomUUID(), anonymousId: '' }),
    ).toBe(0);
    expect(
      await useCase.execute({ customerId: '', anonymousId: randomUUID() }),
    ).toBe(0);
    expect(mockRepository.mergeAnonymousEventsToCustomer).not.toHaveBeenCalled();
  });

  it('resolves customerId from userId and never throws from mergeForUserSafe', async () => {
    const userId = randomUUID();
    const customerId = randomUUID();
    const anonymousId = randomUUID();

    mockRepository.findCustomerIdByUserId.mockResolvedValueOnce(customerId);
    const merged = await useCase.mergeForUserSafe(userId, anonymousId);

    expect(merged).toBe(3);
    expect(mockRepository.mergeAnonymousEventsToCustomer).toHaveBeenCalledWith(
      customerId,
      anonymousId,
    );

    mockRepository.findCustomerIdByUserId.mockRejectedValueOnce(
      new Error('DB transient error'),
    );
    await expect(
      useCase.mergeForUserSafe(userId, anonymousId),
    ).resolves.toBe(0);
  });

  it('executes SQL with both customer_id IS NULL and 30-day window conditions', async () => {
    const executeRaw = jest.fn().mockResolvedValue(2);
    const repo = new RecommendationRepository({ $executeRaw: executeRaw } as any);
    const customerId = randomUUID();
    const anonymousId = randomUUID();

    const count = await repo.mergeAnonymousEventsToCustomer(
      customerId,
      anonymousId,
    );

    expect(count).toBe(2);
    expect(executeRaw).toHaveBeenCalledTimes(1);
    const sqlStrings = executeRaw.mock.calls[0][0].join(' ');
    expect(sqlStrings).toContain('customer_id IS NULL');
    expect(sqlStrings).toContain("INTERVAL '30 days'");
  });
});
