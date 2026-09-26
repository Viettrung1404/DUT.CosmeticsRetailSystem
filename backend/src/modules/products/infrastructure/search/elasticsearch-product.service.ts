import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';

export interface ElasticsearchProductDocument {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brandName?: string | null;
  categoryName?: string;
  ingredients?: string[];
  tags?: string[];
  basePrice: number;
  salePrice?: number | null;
  primaryImage?: string | null;
  avgRating: number;
  totalSold: number;
  isActive: boolean;
}

@Injectable()
export class ElasticsearchProductService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchProductService.name);
  private client: Client | null = null;
  private isConnected = false;
  private readonly indexName = 'products';

  constructor(private readonly configService: ConfigService) {
    const node = this.configService.get<string>('ELASTICSEARCH_NODE', 'http://localhost:9200');
    try {
      this.client = new Client({ node });
    } catch (error) {
      this.logger.warn(`Could not initialize Elasticsearch client: ${(error as Error).message}`);
    }
  }

  async onModuleInit() {
    await this.initIndex();
  }

  async isHealthy(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const ping = await this.client.ping();
      return !!ping;
    } catch {
      return false;
    }
  }

  async initIndex(): Promise<void> {
    if (!this.client) return;
    try {
      const ping = await this.client.ping();
      if (!ping) {
        this.logger.warn('Elasticsearch ping failed. Fallback to PostgreSQL search will be used.');
        return;
      }
      this.isConnected = true;

      const exists = await this.client.indices.exists({ index: this.indexName });
      if (!exists) {
        await (this.client.indices.create as any)({
          index: this.indexName,
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
              brandName: { type: 'text', analyzer: 'vietnamese_analyzer' },
              categoryName: { type: 'text', analyzer: 'vietnamese_analyzer' },
              ingredients: { type: 'text', analyzer: 'vietnamese_analyzer' },
              tags: { type: 'keyword' },
              basePrice: { type: 'float' },
              salePrice: { type: 'float' },
              primaryImage: { type: 'keyword' },
              avgRating: { type: 'float' },
              totalSold: { type: 'integer' },
              isActive: { type: 'boolean' },
            },
          },
        });
        this.logger.log(`Created Elasticsearch index: ${this.indexName} with Vietnamese analyzer`);
      }
    } catch (error) {
      this.isConnected = false;
      this.logger.warn(
        `Elasticsearch is currently unreachable (${(error as Error).message}). Database fallback active.`,
      );
    }
  }

  async indexProduct(doc: ElasticsearchProductDocument): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.index({
        index: this.indexName,
        id: doc.id,
        document: doc,
      });
    } catch (error) {
      this.logger.error(`Failed to index product ${doc.id}: ${(error as Error).message}`);
    }
  }

  get isAvailable(): boolean {
    return this.isConnected && !!this.client;
  }

  // Ghi đè hàng loạt; trả về số tài liệu ghi thành công
  async bulkIndex(docs: ElasticsearchProductDocument[]): Promise<number> {
    if (!this.isAvailable || docs.length === 0) return 0;
    try {
      const result = await this.client!.bulk({
        operations: docs.flatMap((doc) => [{ index: { _index: this.indexName, _id: doc.id } }, doc]),
      });
      const failed = result.items.filter((item) => item.index?.error).length;
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
      this.logger.log(`Deleted product ${id} from Elasticsearch index`);
    } catch (error) {
      this.logger.error(`Failed to delete product ${id} from ES: ${(error as Error).message}`);
    }
  }

  async search(query: string, from = 0, size = 20): Promise<{ ids: string[]; total: number } | null> {
    if (!this.isConnected || !this.client) return null;
    try {
      const response = await (this.client.search as any)({
        index: this.indexName,
        from,
        size,
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query,
                  fields: ['name^3', 'brandName^2', 'ingredients', 'categoryName', 'tags'],
                  fuzziness: 'AUTO',
                },
              },
            ],
            filter: [{ term: { isActive: true } }],
          },
        },
      });

      const total =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value ?? 0;

      const ids = response.hits.hits.map((hit: any) => hit._id as string);
      return { ids, total };
    } catch (error) {
      this.logger.warn(`Elasticsearch search failed: ${(error as Error).message}. Using DB fallback.`);
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
      });

      return response.hits.hits.map((hit: any) => {
        const doc = hit._source as ElasticsearchProductDocument;
        return {
          id: doc.id,
          name: doc.name,
          slug: doc.slug,
          imageUrl: doc.primaryImage,
          price: doc.salePrice ?? doc.basePrice,
        };
      });
    } catch (error) {
      this.logger.warn(`Elasticsearch suggest failed: ${(error as Error).message}. Using DB fallback.`);
      return null;
    }
  }
}
