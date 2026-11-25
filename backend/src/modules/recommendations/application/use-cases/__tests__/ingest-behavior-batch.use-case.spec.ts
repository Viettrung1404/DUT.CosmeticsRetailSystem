import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { BehaviorEventType, RecommendationPlacement } from '@prisma/client';
import { randomUUID } from 'crypto';
import { IngestEventsBatchDto } from '../../../presentation/dtos/ingest-events-batch.dto';
import { IngestBehaviorBatchUseCase } from '../ingest-behavior-batch.use-case';

describe('IngestBehaviorBatchUseCase & IngestEventsBatchDto', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  let mockRepository: {
    createBehaviorEventsBatch: jest.Mock;
    incrementDailyImpressions: jest.Mock;
  };
  let useCase: IngestBehaviorBatchUseCase;

  beforeEach(() => {
    mockRepository = {
      createBehaviorEventsBatch: jest.fn().mockResolvedValue({ count: 1 }),
      incrementDailyImpressions: jest.fn().mockResolvedValue(undefined),
    };
    useCase = new IngestBehaviorBatchUseCase(mockRepository as any);
  });

  it('rejects PURCHASE and ADD_TO_CART in client DTO validation', async () => {
    const anonId = randomUUID();
    for (const forbiddenType of [
      BehaviorEventType.PURCHASE,
      BehaviorEventType.ADD_TO_CART,
    ]) {
      await expect(
        pipe.transform(
          {
            anonymousId: anonId,
            events: [
              {
                id: randomUUID(),
                eventType: forbiddenType,
                productId: randomUUID(),
              },
            ],
          },
          { type: 'body', metatype: IngestEventsBatchDto },
        ),
      ).rejects.toThrow(BadRequestException);
    }
  });

  it('rejects customerId in client request body, non-UUID ids, and > 50 events', async () => {
    const anonId = randomUUID();

    // Rejects customerId injected in body
    await expect(
      pipe.transform(
        {
          anonymousId: anonId,
          customerId: randomUUID(),
          events: [
            {
              id: randomUUID(),
              eventType: BehaviorEventType.VIEW_PRODUCT,
              productId: randomUUID(),
            },
          ],
        },
        { type: 'body', metatype: IngestEventsBatchDto },
      ),
    ).rejects.toThrow(BadRequestException);

    // Rejects non-UUID v4 event id
    await expect(
      pipe.transform(
        {
          anonymousId: anonId,
          events: [
            {
              id: 'not-a-uuid',
              eventType: BehaviorEventType.VIEW_PRODUCT,
            },
          ],
        },
        { type: 'body', metatype: IngestEventsBatchDto },
      ),
    ).rejects.toThrow(BadRequestException);

    // Rejects > 50 events
    const tooMany = Array.from({ length: 51 }, () => ({
      id: randomUUID(),
      eventType: BehaviorEventType.VIEW_PRODUCT,
    }));
    await expect(
      pipe.transform(
        { anonymousId: anonId, events: tooMany },
        { type: 'body', metatype: IngestEventsBatchDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('persists whitelisted events with skipDuplicates=true, ignores body customerId, and uses verifiedCustomerId', async () => {
    const anonId = randomUUID();
    const eventId = randomUUID();
    const productId = randomUUID();
    const verifiedCustomerId = randomUUID();
    const spoofedCustomerId = randomUUID();

    mockRepository.createBehaviorEventsBatch.mockResolvedValueOnce({ count: 1 });

    const result = await useCase.executeClientBatch(
      {
        anonymousId: anonId,
        customerId: spoofedCustomerId, // defense-in-depth: must be ignored
        events: [
          {
            id: eventId,
            eventType: BehaviorEventType.TRY_ON_COLOR,
            productId,
            source: 'rec_home',
            metadata: {
              shadeHex: '#C84B5B',
              email: 'pii@example.com',
              phone: '0901234567',
            },
          },
        ],
        impressions: [{ placement: RecommendationPlacement.HOME, count: 4 }],
      } as any,
      verifiedCustomerId,
    );

    expect(result).toEqual({ received: 1, inserted: 1 });
    expect(mockRepository.createBehaviorEventsBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        id: eventId,
        anonymousId: anonId,
        customerId: verifiedCustomerId,
        eventType: BehaviorEventType.TRY_ON_COLOR,
        productId,
        weight: 2.5,
        source: 'rec_home',
        metadata: { shadeHex: '#C84B5B' },
      }),
    ]);
    expect(mockRepository.incrementDailyImpressions).toHaveBeenCalledWith([
      { placement: RecommendationPlacement.HOME, count: 4 },
    ]);
  });

  it('handles duplicate UUID retries idempotently (inserted reflects skipDuplicates count) and rejects PURCHASE directly in useCase', async () => {
    const anonId = randomUUID();
    const dupId = randomUUID();
    mockRepository.createBehaviorEventsBatch.mockResolvedValueOnce({ count: 0 });

    const res = await useCase.executeClientBatch(
      {
        anonymousId: anonId,
        events: [{ id: dupId, eventType: BehaviorEventType.VIEW_PRODUCT }],
      },
      null,
    );
    expect(res).toEqual({ received: 1, inserted: 0 });

    await expect(
      useCase.executeClientBatch(
        {
          anonymousId: anonId,
          events: [
            {
              id: randomUUID(),
              eventType: BehaviorEventType.PURCHASE as any,
            },
          ],
        },
        null,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('persists internal Worker Consumer envelopes with Edge-verified customerId and skipDuplicates', async () => {
    const anon1 = randomUUID();
    const anon2 = randomUUID();
    const customer1 = randomUUID();
    mockRepository.createBehaviorEventsBatch.mockResolvedValueOnce({ count: 2 });

    const res = await useCase.executeInternalBatch({
      batches: [
        {
          anonymousId: anon1,
          customerId: customer1,
          events: [
            {
              id: randomUUID(),
              eventType: BehaviorEventType.VIEW_PRODUCT,
              productId: randomUUID(),
            },
          ],
          impressions: [{ placement: RecommendationPlacement.HOME, count: 2 }],
        },
        {
          anonymousId: anon2,
          customerId: null,
          events: [
            {
              id: randomUUID(),
              eventType: BehaviorEventType.SEARCH_CLICK,
              productId: randomUUID(),
            },
          ],
        },
      ],
    });

    expect(res).toEqual({ received: 2, inserted: 2 });
    expect(mockRepository.createBehaviorEventsBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        anonymousId: anon1,
        customerId: customer1,
        eventType: BehaviorEventType.VIEW_PRODUCT,
      }),
      expect.objectContaining({
        anonymousId: anon2,
        customerId: null,
        eventType: BehaviorEventType.SEARCH_CLICK,
      }),
    ]);
    expect(mockRepository.incrementDailyImpressions).toHaveBeenCalledWith([
      { placement: RecommendationPlacement.HOME, count: 2 },
    ]);
  });

  it('resolves NestJS JWT userId from CF Worker Consumer to real customerId in DB', async () => {
    const anon = randomUUID();
    const jwtUserId = randomUUID();
    const realCustomerId = randomUUID();
    const resolveCustomerIdLookup = jest
      .fn()
      .mockResolvedValue(new Map([[jwtUserId, realCustomerId]]));

    const useCaseWithLookup = new IngestBehaviorBatchUseCase({
      ...mockRepository,
      resolveCustomerIdLookup,
    } as any);

    await useCaseWithLookup.executeInternalBatch({
      batches: [
        {
          anonymousId: anon,
          customerId: jwtUserId,
          userId: jwtUserId,
          events: [
            {
              id: randomUUID(),
              eventType: BehaviorEventType.VIEW_PRODUCT,
              productId: randomUUID(),
            },
          ],
        },
      ],
    });

    expect(resolveCustomerIdLookup).toHaveBeenCalledWith([jwtUserId]);
    expect(mockRepository.createBehaviorEventsBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        anonymousId: anon,
        customerId: realCustomerId,
      }),
    ]);
  });
});
