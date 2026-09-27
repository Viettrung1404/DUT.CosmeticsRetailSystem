import { BadRequestException } from '@nestjs/common';
import { StoreResolverService, IStoreInventoryProvider } from '../store-resolver.service';

describe('StoreResolverService (TDD)', () => {
  let service: StoreResolverService;
  let mockProvider: jest.Mocked<IStoreInventoryProvider>;

  beforeEach(() => {
    mockProvider = {
      getActiveStores: jest.fn(),
      getStoreInventories: jest.fn(),
      getStoreById: jest.fn(),
    };
    service = new StoreResolverService(mockProvider);
  });

  describe('When customer specifies a store (Click and Collect)', () => {
    it('should resolve the specified store if it has sufficient stock for all items', async () => {
      mockProvider.getStoreById.mockResolvedValue({
        id: 'store-1',
        name: 'Chi nhánh Đà Nẵng',
        isActive: true,
      });

      mockProvider.getStoreInventories.mockResolvedValue([
        { storeId: 'store-1', variantId: 'var-1', quantity: 10, reservedQuantity: 2 }, // available 8 >= 2
        { storeId: 'store-1', variantId: 'var-2', quantity: 5, reservedQuantity: 1 },  // available 4 >= 1
      ]);

      const storeId = await service.resolveStoreForOrder({
        requestedStoreId: 'store-1',
        items: [
          { variantId: 'var-1', quantity: 2 },
          { variantId: 'var-2', quantity: 1 },
        ],
      });

      expect(storeId).toBe('store-1');
    });

    it('should throw BadRequestException if the specified store does not have enough stock', async () => {
      mockProvider.getStoreById.mockResolvedValue({
        id: 'store-1',
        name: 'Chi nhánh Đà Nẵng',
        isActive: true,
      });

      mockProvider.getStoreInventories.mockResolvedValue([
        { storeId: 'store-1', variantId: 'var-1', quantity: 3, reservedQuantity: 2 }, // available 1 < 2
      ]);

      await expect(
        service.resolveStoreForOrder({
          requestedStoreId: 'store-1',
          items: [{ variantId: 'var-1', quantity: 2 }],
        }),
      ).rejects.toThrow(
        new BadRequestException('Chi nhánh Chi nhánh Đà Nẵng không đủ tồn kho cho các sản phẩm yêu cầu'),
      );
    });

    it('should throw BadRequestException if specified store is inactive or not found', async () => {
      mockProvider.getStoreById.mockResolvedValue(null);

      await expect(
        service.resolveStoreForOrder({
          requestedStoreId: 'invalid-store',
          items: [{ variantId: 'var-1', quantity: 1 }],
        }),
      ).rejects.toThrow(new BadRequestException('Chi nhánh được chọn không tồn tại hoặc đã ngưng hoạt động'));
    });
  });

  describe('When customer orders online without specifying a store', () => {
    it('should prioritize online warehouse if it has sufficient inventory', async () => {
      mockProvider.getActiveStores.mockResolvedValue([
        { id: 'store-online', name: 'Kho Online Tổng', isOnlineWarehouse: true, isActive: true },
        { id: 'store-hcm', name: 'Chi nhánh HCM', isOnlineWarehouse: false, isActive: true },
      ]);

      mockProvider.getStoreInventories.mockImplementation(async (storeId) => {
        if (storeId === 'store-online') {
          return [{ storeId: 'store-online', variantId: 'var-1', quantity: 20, reservedQuantity: 0 }];
        }
        return [{ storeId: 'store-hcm', variantId: 'var-1', quantity: 5, reservedQuantity: 0 }];
      });

      const storeId = await service.resolveStoreForOrder({
        items: [{ variantId: 'var-1', quantity: 2 }],
      });

      expect(storeId).toBe('store-online');
    });

    it('should fallback to other physical store if online warehouse is out of stock', async () => {
      mockProvider.getActiveStores.mockResolvedValue([
        { id: 'store-online', name: 'Kho Online Tổng', isOnlineWarehouse: true, isActive: true },
        { id: 'store-hcm', name: 'Chi nhánh HCM', isOnlineWarehouse: false, isActive: true },
      ]);

      mockProvider.getStoreInventories.mockImplementation(async (storeId) => {
        if (storeId === 'store-online') {
          return [{ storeId: 'store-online', variantId: 'var-1', quantity: 1, reservedQuantity: 1 }]; // available 0 < 2
        }
        return [{ storeId: 'store-hcm', variantId: 'var-1', quantity: 10, reservedQuantity: 0 }]; // available 10 >= 2
      });

      const storeId = await service.resolveStoreForOrder({
        items: [{ variantId: 'var-1', quantity: 2 }],
      });

      expect(storeId).toBe('store-hcm');
    });

    it('should throw BadRequestException if no store has enough inventory for the order', async () => {
      mockProvider.getActiveStores.mockResolvedValue([
        { id: 'store-online', name: 'Kho Online Tổng', isOnlineWarehouse: true, isActive: true },
        { id: 'store-hcm', name: 'Chi nhánh HCM', isOnlineWarehouse: false, isActive: true },
      ]);

      mockProvider.getStoreInventories.mockResolvedValue([
        { storeId: 'any', variantId: 'var-1', quantity: 0, reservedQuantity: 0 },
      ]);

      await expect(
        service.resolveStoreForOrder({
          items: [{ variantId: 'var-1', quantity: 5 }],
        }),
      ).rejects.toThrow(
        new BadRequestException('Rất tiếc, sản phẩm trong đơn hàng hiện không còn đủ tồn kho tại bất kỳ chi nhánh nào để giao hàng'),
      );
    });
  });
});
