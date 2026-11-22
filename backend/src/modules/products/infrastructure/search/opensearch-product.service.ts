import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';

export interface OpenSearchProductDocument {
  id: string;
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  categoryName?: string;
  categorySlug?: string;
  brandId?: string | null;
  brandName?: string | null;
  brandSlug?: string | null;
  ingredients?: string[];
  tags?: string[];
  basePrice: number;
  salePrice?: number | null;
  minPrice: number;
  maxPrice: number;
  primaryImage?: string | null;
  avgRating: number;
  totalReviews?: number;
  totalSold: number;
  isActive: boolean;
  hasActiveVariants: boolean;
  createdAt: string;
}

// Backward-compatibility alias
export type ElasticsearchProductDocument = OpenSearchProductDocument;

export interface OpenSearchProductFilterParams {
  query?: string;
  categoryId?: string;
  categoryIds?: string[];
  brandId?: string;
  brandIds?: string[];
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  tag?: string;
  tags?: string[];
  sortBy?: string;
  from?: number;
  size?: number;
}

export interface OpenSearchFacetsResult {
  categories: Array<{ id: string; name: string; slug: string; count: number }>;
  brands: Array<{ id: string; name: string; slug: string; count: number }>;
  tags: Array<{ name: string; count: number }>;
}

@Injectable()
export class OpenSearchProductService implements OnModuleInit {
  private readonly logger = new Logger(OpenSearchProductService.name);
  private client: Client | null = null;
  private isConnected = false;
  private readonly indexName = 'products';

  constructor(private readonly configService: ConfigService) {
    const node =
      this.configService.get<string>('OPENSEARCH_NODE') ||
      this.configService.get<string>('ELASTICSEARCH_NODE', 'http://localhost:9200');

    try {
      this.client = new Client({ node });
    } catch (error) {
      this.logger.warn(`Could not initialize OpenSearch client: ${(error as Error).message}`);
    }
  }

  async onModuleInit() {
    await this.initIndex();
  }

  async isHealthy(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const ping = await this.client.ping();
      return !!ping && (ping.statusCode ? ping.statusCode === 200 : true);
    } catch {
      return false;
    }
  }

  async initIndex(): Promise<void> {
    if (!this.client) return;
    try {
      const ping = await this.client.ping();
      if (!ping || (ping.statusCode && ping.statusCode !== 200)) {
        this.logger.warn('OpenSearch ping failed. Fallback to PostgreSQL search will be used.');
        return;
      }
      this.isConnected = true;

      const existsRes = await this.client.indices.exists({ index: this.indexName });
      const exists = typeof existsRes === 'boolean' ? existsRes : existsRes.body;

      if (!exists) {
        await this.client.indices.create({
          index: this.indexName,
          body: {
            settings: {
              analysis: {
                analyzer: {
                  vietnamese_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'asciifolding'],
                  },
                },
              },
            },
            mappings: {
              properties: {
                id: { type: 'keyword' },
                name: {
                  type: 'text',
                  analyzer: 'vietnamese_analyzer',
                  fields: { keyword: { type: 'keyword' } },
                },
                slug: { type: 'keyword' },
                sku: { type: 'keyword' },
                categoryId: { type: 'keyword' },
                categoryName: {
                  type: 'text',
                  analyzer: 'vietnamese_analyzer',
                  fields: { keyword: { type: 'keyword' } },
                },
                categorySlug: { type: 'keyword' },
                brandId: { type: 'keyword' },
                brandName: {
                  type: 'text',
                  analyzer: 'vietnamese_analyzer',
                  fields: { keyword: { type: 'keyword' } },
                },
                brandSlug: { type: 'keyword' },
                ingredients: { type: 'text', analyzer: 'vietnamese_analyzer' },
                tags: { type: 'keyword' },
                basePrice: { type: 'float' },
                salePrice: { type: 'float' },
                minPrice: { type: 'float' },
                maxPrice: { type: 'float' },
                primaryImage: { type: 'keyword' },
                avgRating: { type: 'float' },
                totalReviews: { type: 'integer' },
                totalSold: { type: 'integer' },
                isActive: { type: 'boolean' },
                hasActiveVariants: { type: 'boolean' },
                createdAt: { type: 'date' },
              },
            },
          },
        });
        this.logger.log(`Created OpenSearch index: ${this.indexName} with Vietnamese analyzer`);
      }
    } catch (error) {
      this.isConnected = false;
      this.logger.warn(
        `OpenSearch is currently unreachable (${(error as Error).message}). Database fallback active.`,
      );
    }
  }

  async indexProduct(doc: OpenSearchProductDocument): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.index({
        index: this.indexName,
        id: doc.id,
        body: doc,
      });
    } catch (error) {
      this.logger.error(`Failed to index product ${doc.id}: ${(error as Error).message}`);
    }
  }

  get isAvailable(): boolean {
    return this.isConnected && !!this.client;
  }

  /** Durable worker path: propagate errors and reject writes older than the indexed version. */
  async syncVersioned(
    id: string,
    doc: OpenSearchProductDocument | null,
    version: number,
  ): Promise<void> {
    if (!this.isAvailable) throw new Error('OPENSEARCH_UNAVAILABLE');
    try {
      if (doc) {
        await this.client!.index({
          index: this.indexName,
          id,
          body: doc,
          version,
          version_type: 'external_gte',
        });
      } else {
        await this.client!.delete({
          index: this.indexName,
          id,
          version,
          version_type: 'external_gte',
        });
      }
    } catch (error) {
      const code =
        (error as { statusCode?: number; meta?: { statusCode?: number } }).statusCode ??
        (error as { meta?: { statusCode?: number } }).meta?.statusCode;
      if (code !== 409 && !(doc === null && code === 404)) throw error;
    }
  }

  // Ghi đè hàng loạt; trả về số tài liệu ghi thành công
  async bulkIndex(docs: OpenSearchProductDocument[]): Promise<number> {
    if (!this.isAvailable || docs.length === 0) return 0;
    try {
      const operations = docs.flatMap((doc) => [
        { index: { _index: this.indexName, _id: doc.id } },
        doc,
      ]);
      const result = await this.client!.bulk({
        body: operations,
      });
      const items = (result.body as any)?.items ?? [];
      const failed = items.filter((item: any) => item.index?.error).length;
      if (failed) this.logger.error(`Bulk index: ${failed}/${docs.length} documents failed`);
      return docs.length - failed;
    } catch (error) {
      this.logger.error(`Bulk index failed: ${(error as Error).message}`);
      return 0;
    }
  }

  async deleteProduct(id: string): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.delete({
        index: this.indexName,
        id,
      });
      this.logger.log(`Deleted product ${id} from OpenSearch index`);
    } catch (error) {
      this.logger.error(`Failed to delete product ${id} from OpenSearch: ${(error as Error).message}`);
    }
  }

  /**
   * Batch get products by IDs from OpenSearch (mget)
   */
  async getProductsByIds(ids: string[]): Promise<OpenSearchProductDocument[] | null> {
    if (!this.isConnected || !this.client || ids.length === 0) return null;
    try {
      const response = await (this.client.mget as any)({
        index: this.indexName,
        body: {
          docs: ids.map((id) => ({ _id: id })),
        },
      });

      const docs = (response.body as any)?.docs ?? (response as any)?.docs ?? [];
      const found: OpenSearchProductDocument[] = [];
      for (const item of docs) {
        if (item.found && item._source) {
          found.push(item._source as OpenSearchProductDocument);
        }
      }
      return found;
    } catch (error) {
      this.logger.error(`mget products failed: ${(error as Error).message}`);
      return null;
    }
  }

  async search(
    query: string,
    from = 0,
    size = 20,
  ): Promise<{ ids: string[]; total: number } | null> {
    return this.filterProducts({ query, from, size });
  }

  /**
   * Filter, Sort, and Paginate products via OpenSearch (Hybrid architecture)
   */
  async filterProducts(
    params: OpenSearchProductFilterParams,
  ): Promise<{ ids: string[]; total: number; docs: OpenSearchProductDocument[] } | null> {
    if (!this.isConnected || !this.client) return null;

    try {
      const filterClauses: any[] = [
        { term: { isActive: true } },
        { term: { hasActiveVariants: true } },
      ];

      // 1. Categories
      if (params.categoryIds && params.categoryIds.length > 0) {
        filterClauses.push({ terms: { categoryId: params.categoryIds } });
      } else if (params.categoryId) {
        filterClauses.push({ term: { categoryId: params.categoryId } });
      }

      // 2. Brands
      if (params.brandIds && params.brandIds.length > 0) {
        filterClauses.push({ terms: { brandId: params.brandIds } });
      } else if (params.brandId) {
        filterClauses.push({ term: { brandId: params.brandId } });
      }

      // 3. Price range
      if (params.minPrice !== undefined || params.maxPrice !== undefined) {
        const priceRange: any = {};
        if (params.minPrice !== undefined) priceRange.gte = params.minPrice;
        if (params.maxPrice !== undefined) priceRange.lte = params.maxPrice;
        filterClauses.push({ range: { minPrice: priceRange } });
      }

      // 4. Rating
      if (params.rating !== undefined) {
        filterClauses.push({ range: { avgRating: { gte: params.rating } } });
      }

      // 5. Tags
      if (params.tags && params.tags.length > 0) {
        filterClauses.push({ terms: { tags: params.tags } });
      } else if (params.tag) {
        filterClauses.push({ term: { tags: params.tag } });
      }

      // 6. Text Query (Search)
      const mustClauses: any[] = [];
      if (params.query && params.query.trim().length > 0) {
        mustClauses.push({
          multi_match: {
            query: params.query.trim(),
            fields: ['name^3', 'brandName^2', 'ingredients', 'categoryName', 'tags'],
            fuzziness: 'AUTO',
          },
        });
      }

      // 7. Sort clauses
      const sortClauses: any[] = [];
      switch (params.sortBy) {
        case 'price_asc':
          sortClauses.push({ minPrice: 'asc' }, { basePrice: 'asc' }, { id: 'asc' });
          break;
        case 'price_desc':
          sortClauses.push({ maxPrice: 'desc' }, { basePrice: 'desc' }, { id: 'asc' });
          break;
        case 'bestseller':
          sortClauses.push({ totalSold: 'desc' }, { id: 'asc' });
          break;
        case 'rating':
          sortClauses.push({ avgRating: 'desc' }, { id: 'asc' });
          break;
        case 'newest':
          sortClauses.push({ createdAt: 'desc' }, { id: 'asc' });
          break;
        default:
          if (params.query && params.query.trim().length > 0) {
            sortClauses.push({ _score: 'desc' }, { totalSold: 'desc' }, { id: 'asc' });
          } else {
            sortClauses.push({ createdAt: 'desc' }, { id: 'asc' });
          }
          break;
      }

      const response = await (this.client.search as any)({
        index: this.indexName,
        from: params.from ?? 0,
        size: params.size ?? 20,
        body: {
          query: {
            bool: {
              filter: filterClauses,
              ...(mustClauses.length > 0 && { must: mustClauses }),
            },
          },
          sort: sortClauses,
        },
      });

      const hits = (response.body as any)?.hits;
      const total =
        typeof hits?.total === 'number'
          ? hits.total
          : hits?.total?.value ?? 0;

      const ids = (hits?.hits ?? []).map((hit: any) => hit._id as string);
      const docs = (hits?.hits ?? []).map((hit: any) => hit._source as OpenSearchProductDocument);
      return { ids, total, docs };
    } catch (error) {
      this.logger.warn(`OpenSearch filter failed: ${(error as Error).message}. Using DB fallback.`);
      return null;
    }
  }

  /**
   * Faceted Aggregations via OpenSearch
   */
  async getFacets(categoryIds?: string[]): Promise<OpenSearchFacetsResult | null> {
    if (!this.isConnected || !this.client) return null;

    try {
      const filterClauses: any[] = [
        { term: { isActive: true } },
        { term: { hasActiveVariants: true } },
      ];

      if (categoryIds && categoryIds.length > 0) {
        filterClauses.push({ terms: { categoryId: categoryIds } });
      }

      const response = await (this.client.search as any)({
        index: this.indexName,
        size: 0,
        body: {
          query: {
            bool: {
              filter: filterClauses,
            },
          },
          aggs: {
            categories: {
              terms: { field: 'categoryId', size: 100 },
              aggs: {
                name: { terms: { field: 'categoryName.keyword', size: 1 } },
                slug: { terms: { field: 'categorySlug', size: 1 } },
              },
            },
            brands: {
              terms: { field: 'brandId', size: 500 },
              aggs: {
                name: { terms: { field: 'brandName.keyword', size: 1 } },
                slug: { terms: { field: 'brandSlug', size: 1 } },
              },
            },
            tags: {
              terms: { field: 'tags', size: 200 },
            },
          },
        },
      });

      const aggs = (response.body as any)?.aggregations;
      if (!aggs) return null;

      const categories = (aggs.categories?.buckets ?? [])
        .map((b: any) => ({
          id: b.key as string,
          count: b.doc_count as number,
          name: (b.name?.buckets?.[0]?.key as string) ?? '',
          slug: (b.slug?.buckets?.[0]?.key as string) ?? '',
        }))
        .filter((c: any) => c.name.length > 0);

      const brands = (aggs.brands?.buckets ?? [])
        .map((b: any) => ({
          id: b.key as string,
          count: b.doc_count as number,
          name: (b.name?.buckets?.[0]?.key as string) ?? '',
          slug: (b.slug?.buckets?.[0]?.key as string) ?? '',
        }))
        .filter((b: any) => b.name.length > 0 && b.count > 0)
        .sort((a: any, b: any) => b.count - a.count || a.name.localeCompare(b.name));

      const tags = (aggs.tags?.buckets ?? [])
        .map((b: any) => ({
          name: b.key as string,
          count: b.doc_count as number,
        }))
        .sort((a: any, b: any) => b.count - a.count || a.name.localeCompare(b.name));

      return { categories, brands, tags };
    } catch (error) {
      this.logger.warn(`OpenSearch facets failed: ${(error as Error).message}. Using DB fallback.`);
      return null;
    }
  }

  async suggest(
    query: string,
    limit = 8,
  ): Promise<Array<{ id: string; name: string; slug: string; imageUrl?: string | null; price: number }> | null> {
    if (!this.isConnected || !this.client) return null;
    try {
      const response = await (this.client.search as any)({
        index: this.indexName,
        size: limit,
        body: {
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    query,
                    fields: ['name^3', 'brandName^2'],
                    type: 'phrase_prefix',
                  },
                },
              ],
              filter: [{ term: { isActive: true } }],
            },
          },
        },
      });

      const hits = (response.body as any)?.hits;
      return (hits?.hits ?? []).map((hit: any) => {
        const doc = hit._source as OpenSearchProductDocument;
        return {
          id: doc.id,
          name: doc.name,
          slug: doc.slug,
          imageUrl: doc.primaryImage,
          price: doc.salePrice ?? doc.basePrice,
        };
      });
    } catch (error) {
      this.logger.warn(`OpenSearch suggest failed: ${(error as Error).message}. Using DB fallback.`);
      return null;
    }
  }

  async searchHints(
    query: string,
    limit = 5,
  ): Promise<{
    products: Array<{ id: string; name: string; slug: string; imageUrl?: string | null; price: number }>;
    brands: Array<{ id: string; name: string; slug: string }>;
    keywords: string[];
  } | null> {
    if (!this.isConnected || !this.client || !query.trim()) return null;
    try {
      const response = await (this.client.search as any)({
        index: this.indexName,
        size: limit,
        body: {
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    query: query.trim(),
                    fields: ['name^3', 'brandName^2', 'tags'],
                    type: 'phrase_prefix',
                  },
                },
              ],
              filter: [{ term: { isActive: true } }],
            },
          },
          aggs: {
            matching_brands: {
              terms: { field: 'brandId', size: 4 },
              aggs: {
                name: { terms: { field: 'brandName.keyword', size: 1 } },
                slug: { terms: { field: 'brandSlug', size: 1 } },
              },
            },
            matching_tags: {
              terms: { field: 'tags', size: 5 },
            },
          },
        },
      });

      const hits = (response.body as any)?.hits?.hits ?? [];
      const products = hits.map((hit: any) => {
        const doc = hit._source as OpenSearchProductDocument;
        return {
          id: doc.id,
          name: doc.name,
          slug: doc.slug,
          imageUrl: doc.primaryImage ?? null,
          price: Number(doc.salePrice ?? doc.basePrice ?? doc.minPrice),
        };
      });

      const aggs = (response.body as any)?.aggregations;
      const brands = (aggs?.matching_brands?.buckets ?? [])
        .map((b: any) => ({
          id: b.key as string,
          name: (b.name?.buckets?.[0]?.key as string) ?? '',
          slug: (b.slug?.buckets?.[0]?.key as string) ?? '',
        }))
        .filter((b: any) => b.name.length > 0 && b.id);

      const keywords = (aggs?.matching_tags?.buckets ?? [])
        .map((b: any) => b.key as string)
        .filter(Boolean);

      return { products, brands, keywords };
    } catch (error) {
      this.logger.warn(`OpenSearch searchHints failed: ${(error as Error).message}`);
      return null;
    }
  }

  async getRelatedProducts(
    productId: string,
    limit = 4,
  ): Promise<OpenSearchProductDocument[] | null> {
    if (!this.isConnected || !this.client) return null;
    try {
      const response = await (this.client.search as any)({
        index: this.indexName,
        size: limit,
        body: {
          query: {
            bool: {
              must: [
                { term: { isActive: true } },
                { term: { hasActiveVariants: true } },
                {
                  more_like_this: {
                    fields: ['name', 'categoryName', 'brandName', 'ingredients'],
                    like: [{ _index: this.indexName, _id: productId }],
                    min_term_freq: 1,
                    max_query_terms: 12,
                    min_doc_freq: 1,
                  },
                },
              ],
              must_not: [{ term: { id: productId } }],
            },
          },
          sort: [{ _score: 'desc' }, { totalSold: 'desc' }],
        },
      });

      const hits = (response.body as any)?.hits?.hits ?? response.hits?.hits ?? [];
      if (!hits.length) {
        // Fallback: If MLT returns 0 items, look up source document category
        try {
          const srcRes: any = await this.client.get({ index: this.indexName, id: productId });
          const src = srcRes.body?._source ?? srcRes._source;
          if (src?.categoryId) {
            const catRes = await (this.client.search as any)({
              index: this.indexName,
              size: limit,
              body: {
                query: {
                  bool: {
                    must: [
                      { term: { isActive: true } },
                      { term: { hasActiveVariants: true } },
                      { term: { categoryId: src.categoryId } },
                    ],
                    must_not: [{ term: { id: productId } }],
                  },
                },
                sort: [{ totalSold: 'desc' }, { _score: 'desc' }],
              },
            });
            const catHits = (catRes.body as any)?.hits?.hits ?? catRes.hits?.hits ?? [];
            return catHits.map((h: any) => h._source as OpenSearchProductDocument);
          }
        } catch {
          // Ignore fallback failure
        }
      }
      return hits.map((hit: any) => hit._source as OpenSearchProductDocument);
    } catch (error) {
      this.logger.warn(`OpenSearch getRelatedProducts failed: ${(error as Error).message}`);
      return null;
    }
  }
}

// Backward-compatibility class alias
export class ElasticsearchProductService extends OpenSearchProductService {}
