import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  IStoreInventoryProvider,
  StoreInfo,
  StoreInventoryRecord,
} from '../../application/services/store-resolver.service';

export const STORE_INVENTORY_PROVIDER = 'STORE_INVENTORY_PROVIDER';

@Injectable()
export class PrismaStoreInventoryAdapter implements IStoreInventoryProvider {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveStores(): Promise<StoreInfo[]> {
    const stores = await this.prisma.store.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        type: true,
        code: true,
        isActive: true,
      },
    });

    return stores.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      code: s.code,
      isOnlineWarehouse: s.code === 'STORE_ONLINE' || s.type === 'ONLINE',
      isActive: s.isActive,
    }));
  }

  async getStoreInventories(
    storeId: string,
    variantIds: string[],
  ): Promise<StoreInventoryRecord[]> {
    const records = await this.prisma.inventory.findMany({
      where: {
        storeId,
        productVariantId: { in: variantIds },
      },
      select: {
        storeId: true,
        productVariantId: true,
        quantity: true,
        reservedQuantity: true,
      },
    });

    return records.map((r) => ({
      storeId: r.storeId,
      variantId: r.productVariantId,
      quantity: r.quantity,
      reservedQuantity: r.reservedQuantity,
    }));
  }

  async getStoreById(storeId: string): Promise<StoreInfo | null> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        type: true,
        code: true,
        isActive: true,
      },
    });

    if (!store) return null;

    return {
      id: store.id,
      name: store.name,
      type: store.type,
      code: store.code,
      isOnlineWarehouse: store.code === 'STORE_ONLINE' || store.type === 'ONLINE',
      isActive: store.isActive,
    };
  }
}
