import { PrismaService } from '@infrastructure/database/prisma.service';
import { ElasticsearchProductService } from '../elasticsearch-product.service';
import { ProductSearchSyncService } from '../product-search-sync.service';

const rawProduct = (id: string) => ({
  id,
  categoryId: 'c1',
  brandId: null,
  name: `SP ${id}`,
  slug: `sp-${id}`,
  sku: `SKU-${id}`,
  description: null,
  shortDescription: null,
  basePrice: 100000,
  salePrice: null,
  option1Name: null,
  option2Name: null,
  option3Name: null,
  isActive: true,
  isFeatured: false,
  avgRating: 0,
  totalReviews: 0,
  totalSold: 0,
  metaTitle: null,
  metaDescription: null,
  metaKeywords: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  variants: [],
  images: [],
  ingredients: [{ id: 'i1', ingredientName: 'Niacinamide', percentage: null, isKeyIngredient: true }],
  tags: [{ tagName: 'organic' }],
  brand: null,
  category: { name: 'Son', slug: 'son', isActive: true },
});

describe('ProductSearchSyncService', () => {
  let findMany: jest.Mock;
  let es: { isAvailable: boolean; bulkIndex: jest.Mock };

  const createService = () =>
    new ProductSearchSyncService(
      { product: { findMany } } as unknown as PrismaService,
      es as unknown as ElasticsearchProductService,
    );

  beforeEach(() => {
    findMany = jest.fn();
    es = { isAvailable: true, bulkIndex: jest.fn((docs: unknown[]) => Promise.resolve(docs.length)) };
  });

  it('đồng bộ toàn bộ sản phẩm từ DB theo từng lô', async () => {
    findMany.mockResolvedValueOnce([rawProduct('a'), rawProduct('b')]).mockResolvedValueOnce([]);

    const indexed = await createService().reindexAll();

    expect(indexed).toBe(2);
    const docs = es.bulkIndex.mock.calls[0][0];
    expect(docs[0]).toMatchObject({ id: 'a', ingredients: ['Niacinamide'], tags: ['organic'] });
    expect(findMany).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: { id: 'b' }, skip: 1 }));
  });

  it('bỏ qua khi Elasticsearch không kết nối được', async () => {
    es.isAvailable = false;
    expect(await createService().reindexAll()).toBe(0);
    expect(findMany).not.toHaveBeenCalled();
  });
});
