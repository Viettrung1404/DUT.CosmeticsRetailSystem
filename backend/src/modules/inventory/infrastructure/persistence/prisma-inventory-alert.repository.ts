import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  AlertNotification,
  IInventoryAlertRepository,
  StoreAlertSummary,
} from '../../domain/repositories/inventory-alert.repository.interface';

const STORE_MANAGER_ROLE = 2;
const WAREHOUSE_ROLE = 4;

@Injectable()
export class PrismaInventoryAlertRepository implements IInventoryAlertRepository {
  constructor(private readonly prisma: PrismaService) {}

  async summarize(today: Date, nearExpiryBefore: Date): Promise<StoreAlertSummary[]> {
    const [stores, low, batches] = await Promise.all([
      this.prisma.store.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
      this.prisma.$queryRaw<{ store_id: string; sku: string; available: number; min_quantity: number }[]>`
        SELECT i.store_id, v.sku, i.available_quantity AS available, i.min_quantity
        FROM inventory i JOIN product_variants v ON v.id = i.product_variant_id
        WHERE i.available_quantity < i.min_quantity
        ORDER BY i.store_id, i.available_quantity`,
      this.prisma.$queryRaw<{ store_id: string; expired: number; near: number }[]>`
        SELECT store_id,
          count(*) FILTER (WHERE expiry_date <= ${today}::date)::int AS expired,
          count(*) FILTER (WHERE expiry_date > ${today}::date AND expiry_date < ${nearExpiryBefore}::date)::int AS near
        FROM batches WHERE quantity > 0
        GROUP BY store_id`,
    ]);
    return stores
      .map((s) => {
        const b = batches.find((x) => x.store_id === s.id);
        return {
          storeId: s.id,
          storeName: s.name,
          lowStock: low
            .filter((l) => l.store_id === s.id)
            .map((l) => ({ sku: l.sku, available: l.available, minQuantity: l.min_quantity })),
          nearExpiryBatches: b?.near ?? 0,
          expiredBatches: b?.expired ?? 0,
        };
      })
      .filter((s) => s.lowStock.length || s.nearExpiryBatches || s.expiredBatches);
  }

  async findRecipients(storeIds: string[]): Promise<{ userId: string; storeId: string }[]> {
    const rows = await this.prisma.userStore.findMany({
      where: {
        storeId: { in: storeIds },
        user: { status: 'ACTIVE', roleId: { in: [STORE_MANAGER_ROLE, WAREHOUSE_ROLE] } },
      },
      select: { userId: true, storeId: true },
    });
    return rows;
  }

  async createNotifications(rows: AlertNotification[]): Promise<number> {
    if (!rows.length) return 0;
    const result = await this.prisma.notification.createMany({
      data: rows.map((r) => ({
        userId: r.userId,
        title: r.title,
        message: r.message,
        type: 'INVENTORY_ALERT',
        data: r.data as object,
        eventKey: r.eventKey,
      })),
      skipDuplicates: true,
    });
    return result.count;
  }
}
