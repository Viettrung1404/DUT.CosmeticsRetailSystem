import { Logger } from '@nestjs/common';
import { PublicCatalogService } from './public-catalog.service';
import { OpenSearchProductService } from '../../infrastructure/search/opensearch-product.service';

describe('PublicCatalogService search & OpenSearch availability', () => {
  it('uses OpenSearch searchHints fast path and caches repeated queries', async () => {
    const db = {
      $queryRaw: jest.fn(async () => []),
      brand: { findMany: jest.fn(async () => []) },
      productTag: { groupBy: jest.fn(async () => []) },
    };
    const searchService = {
      isAvailable: true,
      searchHints: jest.fn(async () => ({
        products: [
          {
            id: 'p-1',
            name: 'Son Kem Lì Black Rouge',
            slug: 'son-kem-li-black-rouge',
            imageUrl: 'https://cdn.example/son.jpg',
            price: 180000,
          },
        ],
        brands: [{ id: 'b-1', name: 'Black Rouge', slug: 'black-rouge' }],
        keywords: ['son kem'],
      })),
    };

    const service = new PublicCatalogService(db as never, searchService as never);
    const first = await service.searchHints('son');
    const second = await service.searchHints('son');

    expect(first.products).toHaveLength(1);
    expect(first.products[0].name).toBe('Son Kem Lì Black Rouge');
    expect(second).toEqual(first);
    expect(searchService.searchHints).toHaveBeenCalledTimes(1);
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it('falls back to lightweight suggestLight SQL when OpenSearch is unavailable', async () => {
    const db = {
      $queryRaw: jest.fn(async () => [
        {
          id: 'p-2',
          name: 'Kem Chống Nắng Anessa',
          slug: 'kem-chong-nang-anessa',
          imageUrl: null,
          price: 465000,
        },
      ]),
      brand: { findMany: jest.fn(async () => []) },
      productTag: { groupBy: jest.fn(async () => []) },
    };
    const searchService = { isAvailable: false };

    const service = new PublicCatalogService(db as never, searchService as never);
    const res = await service.searchHints('kem chống nắng');

    expect(res.products).toHaveLength(1);
    expect(res.products[0].price).toBe(465000);
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('logs clear OpenSearch AVAILABLE and UNAVAILABLE status during initIndex', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    const config = { get: jest.fn((_k: string, def?: string) => def ?? 'http://localhost:9200') };
    const osService = new OpenSearchProductService(config as never);
    (osService as any).client = {
      ping: jest.fn(async () => ({ statusCode: 200 })),
      indices: { exists: jest.fn(async () => true) },
      count: jest.fn(async () => ({ body: { count: 42 } })),
    };

    await osService.initIndex();
    expect(osService.isAvailable).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[OpenSearch] AVAILABLE & CONNECTED'),
    );
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('docs=42'));

    (osService as any).client = {
      ping: jest.fn(async () => {
        throw new Error('ECONNREFUSED');
      }),
    };
    await osService.initIndex();
    expect(osService.isAvailable).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[OpenSearch] UNAVAILABLE'),
    );

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
