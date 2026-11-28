import { WishlistService } from '../wishlist.service';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { OpenSearchProductService } from '@modules/products/infrastructure/search/opensearch-product.service';
import { CustomerCommands } from '../../infrastructure/commands';

describe('WishlistService', () => {
  let service: WishlistService;
  let prisma: any;
  let commands: any;
  let searchService: any;

  beforeEach(() => {
    prisma = {
      wishlist: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      product: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    commands = {
      execute: jest.fn(),
    };
    searchService = {
      isAvailable: true,
      getProductsByIds: jest.fn(),
    };
    service = new WishlistService(
      prisma as unknown as PrismaService,
      commands as unknown as CustomerCommands,
      searchService as unknown as OpenSearchProductService,
    );
  });

  describe('getIds', () => {
    it('should return list of product ids directly from database', async () => {
      prisma.wishlist.findMany.mockResolvedValue([
        { productId: 'prod-1' },
        { productId: 'prod-2' },
      ]);

      const result = await service.getIds('cust-1');

      expect(prisma.wishlist.findMany).toHaveBeenCalledWith({
        where: { customerId: 'cust-1', product: { isActive: true } },
        select: { productId: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
      expect(result).toEqual({ ids: ['prod-1', 'prod-2'] });
    });
  });

  describe('list', () => {
    it('should return empty list when no items exist', async () => {
      prisma.wishlist.findMany.mockResolvedValue([]);
      prisma.wishlist.count.mockResolvedValue(0);

      const result = await service.list('cust-1', 1, 10);

      expect(result).toEqual({ items: [], page: 1, limit: 10, total: 0 });
      expect(searchService.getProductsByIds).not.toHaveBeenCalled();
    });

    it('should fetch from OpenSearch when searchService is available', async () => {
      prisma.wishlist.findMany.mockResolvedValue([
        { productId: 'p1' },
        { productId: 'p2' },
      ]);
      prisma.wishlist.count.mockResolvedValue(2);

      searchService.getProductsByIds.mockResolvedValue([
        {
          id: 'p1',
          name: 'Product 1',
          slug: 'product-1',
          sku: 'SKU1',
          categoryId: 'c1',
          basePrice: 100000,
          minPrice: 100000,
          maxPrice: 100000,
          isActive: true,
          hasActiveVariants: true,
          avgRating: 5,
          totalSold: 10,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'p2',
          name: 'Product 2',
          slug: 'product-2',
          sku: 'SKU2',
          categoryId: 'c1',
          basePrice: 200000,
          minPrice: 200000,
          maxPrice: 200000,
          isActive: true,
          hasActiveVariants: true,
          avgRating: 4.5,
          totalSold: 20,
          createdAt: new Date().toISOString(),
        },
      ]);

      const result = await service.list('cust-1', 1, 10);

      expect(searchService.getProductsByIds).toHaveBeenCalledWith(['p1', 'p2']);
      expect(prisma.product.findMany).not.toHaveBeenCalled();
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe('p1');
      expect(result.items[0].name).toBe('Product 1');
      expect(result.items[0].isWishlisted).toBe(true);
      expect(result.items[1].id).toBe('p2');
    });

    it('should fallback to database when OpenSearch fails or is unavailable', async () => {
      searchService.isAvailable = false;
      prisma.wishlist.findMany.mockResolvedValue([{ productId: 'p1' }]);
      prisma.wishlist.count.mockResolvedValue(1);

      prisma.product.findMany.mockResolvedValue([
        {
          id: 'p1',
          name: 'Product 1',
          slug: 'product-1',
          sku: 'SKU1',
          categoryId: 'c1',
          basePrice: 100000,
          salePrice: null,
          isActive: true,
          isFeatured: false,
          avgRating: 5,
          totalReviews: 1,
          totalSold: 10,
          option1Name: null,
          option2Name: null,
          option3Name: null,
          videoUrl: null,
          variants: [],
          images: [],
          ingredients: [],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.list('cust-1', 1, 10);

      expect(prisma.product.findMany).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('p1');
      expect(result.items[0].isWishlisted).toBe(true);
    });
  });
});
