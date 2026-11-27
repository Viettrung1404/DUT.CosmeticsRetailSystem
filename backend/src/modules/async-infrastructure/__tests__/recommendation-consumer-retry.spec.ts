import { handleRecommendationEventsBatch } from '../../../../../cloudflare-workers/src/consumer';

describe('Recommendation consumer poison-message isolation', () => {
  afterEach(() => jest.restoreAllMocks());

  it('persists healthy neighbours when one envelope fails validation', async () => {
    const messages = ['good-1', 'bad', 'good-2'].map((id) => ({
      id,
      body: { id, anonymousId: id, events: [] },
      ack: jest.fn(),
      retry: jest.fn(),
    }));
    const persisted: string[] = [];
    jest.spyOn(global, 'fetch').mockImplementation(async (_url, options) => {
      const { batches } = JSON.parse(String(options?.body));
      const invalid = batches.some((batch: any) => batch.anonymousId === 'bad');
      if (!invalid)
        persisted.push(...batches.map((batch: any) => batch.anonymousId));
      return { ok: !invalid, status: invalid ? 400 : 200 } as Response;
    });
    await handleRecommendationEventsBatch({ messages } as any, {} as any);
    expect(persisted.sort()).toEqual(['good-1', 'good-2']);
    for (const message of messages) {
      expect(message.ack).toHaveBeenCalledTimes(1);
      expect(message.retry).not.toHaveBeenCalled();
    }
  });

  it.each([401, 403, 404, 429, 500])(
    'retries HTTP %i without dropping any messages',
    async (status) => {
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValue({ ok: false, status } as Response);
      const message = {
        body: { id: 'batch', events: [] },
        ack: jest.fn(),
        retry: jest.fn(),
      };
      await handleRecommendationEventsBatch(
        { messages: [message] } as any,
        {} as any,
      );
      expect(message.retry).toHaveBeenCalledTimes(1);
      expect(message.ack).not.toHaveBeenCalled();
    },
  );
});
