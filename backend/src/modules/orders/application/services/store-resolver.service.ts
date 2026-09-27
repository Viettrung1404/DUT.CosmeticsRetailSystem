import { Injectable, BadRequestException } from '@nestjs/common';

export interface StoreInventoryRecord {
  storeId: string;
  variantId: string;
  quantity: number;
  reservedQuantity: number;
}

export interface StoreInfo {
  id: string;
  name: string;
  type?: string;
  code?: string;
  isOnlineWarehouse?: boolean;
  isActive: boolean;
}

export interface IStoreInventoryProvider {
  getActiveStores(): Promise<StoreInfo[]>;
  getStoreInventories(
    storeId: string,
    variantIds: string[],
  ): Promise<StoreInventoryRecord[]>;
  getStoreById(storeId: string): Promise<StoreInfo | null>;
}

export interface ResolveStoreInput {
  requestedStoreId?: string;
  items: Array<{ variantId: string; quantity: number }>;
}

@Injectable()
export class StoreResolverService {
  constructor(private readonly provider: IStoreInventoryProvider) {}

  async resolveStoreForOrder(input: ResolveStoreInput): Promise<string> {
    const { requestedStoreId, items } = input;
    const variantIds = items.map((i) => i.variantId);

    // 1. If customer explicitly selected a store (Click and Collect)
    if (requestedStoreId) {
      const store = await this.provider.getStoreById(requestedStoreId);
      if (!store || !store.isActive) {
        throw new BadRequestException(
          'Chi nhánh được chọn không tồn tại hoặc đã ngưng hoạt động',
        );
      }

      const inventories = await this.provider.getStoreInventories(
        requestedStoreId,
        variantIds,
      );

      const hasSufficientStock = this.checkAllItemsAvailable(items, inventories);
      if (!hasSufficientStock) {
        throw new BadRequestException(
          `Chi nhánh ${store.name} không đủ tồn kho cho các sản phẩm yêu cầu`,
        );
      }

      return store.id;
    }

    // 2. Online delivery: Determine optimal store/warehouse
    const activeStores = await this.provider.getActiveStores();

    // Sort to prioritize online warehouse: code == 'STORE_ONLINE' or type == 'ONLINE' or isOnlineWarehouse == true
    const prioritizedStores = [...activeStores].sort((a, b) => {
      const aIsOnline =
        a.isOnlineWarehouse || a.type === 'ONLINE' || a.code === 'STORE_ONLINE';
      const bIsOnline =
        b.isOnlineWarehouse || b.type === 'ONLINE' || b.code === 'STORE_ONLINE';
      if (aIsOnline && !bIsOnline) return -1;
      if (!aIsOnline && bIsOnline) return 1;
      return 0;
    });

    for (const store of prioritizedStores) {
      const inventories = await this.provider.getStoreInventories(
        store.id,
        variantIds,
      );
      const isSufficient = this.checkAllItemsAvailable(items, inventories);
      if (isSufficient) {
        return store.id;
      }
    }

    throw new BadRequestException(
      'Rất tiếc, sản phẩm trong đơn hàng hiện không còn đủ tồn kho tại bất kỳ chi nhánh nào để giao hàng',
    );
  }

  private checkAllItemsAvailable(
    items: Array<{ variantId: string; quantity: number }>,
    inventories: StoreInventoryRecord[],
  ): boolean {
    const invMap = new Map<string, number>();
    for (const inv of inventories) {
      const available = inv.quantity - inv.reservedQuantity;
      invMap.set(inv.variantId, available);
    }

    for (const item of items) {
      const available = invMap.get(item.variantId) ?? 0;
      if (available < item.quantity) {
        return false;
      }
    }

    return true;
  }
}
