import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { AtpCalculatorService } from './atp-calculator.service';

export interface InventoryBalanceDto {
  id: string;
  locationId: string;
  productVariantId: string;
  physicalOnHand: number;
  reservedQuantity: number;
  safetyStock: number;
  quarantinedQuantity: number;
  damagedQuantity: number;
  availableQuantity: number; // ATP
  minQuantity: number;
  updatedAt: Date;
}

export interface AvailabilityCheckResult {
  isAvailable: boolean;
  shortfalls: {
    variantId: string;
    required: number;
    available: number;
  }[];
}

@Injectable()
export class InventoryBalanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly atpCalculator: AtpCalculatorService,
  ) {}

  private getClient(tx?: Prisma.TransactionClient) {
    return tx ?? this.prisma;
  }

  /**
   * Lấy chi tiết số dư tồn kho của một variant tại một location
   */
  async getBalance(
    locationId: string,
    variantId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<InventoryBalanceDto | null> {
    const client = this.getClient(tx);

    const record = await client.inventory.findUnique({
      where: {
        storeId_productVariantId: {
          storeId: locationId,
          productVariantId: variantId,
        },
      },
    });

    if (!record) {
      return null;
    }

    const atp = this.atpCalculator.calculateAtp({
      physicalOnHand: record.quantity,
      reservedQuantity: record.reservedQuantity,
      safetyStock: record.safetyStock,
      quarantinedQuantity: record.quarantinedQuantity,
      damagedQuantity: record.damagedQuantity,
    });

    return {
      id: record.id,
      locationId: record.storeId,
      productVariantId: record.productVariantId,
      physicalOnHand: record.quantity,
      reservedQuantity: record.reservedQuantity,
      safetyStock: record.safetyStock,
      quarantinedQuantity: record.quarantinedQuantity,
      damagedQuantity: record.damagedQuantity,
      availableQuantity: atp,
      minQuantity: record.minQuantity,
      updatedAt: record.updatedAt,
    };
  }

  /**
   * Lấy số lượng tồn kho khả dụng (ATP) đơn lẻ của một variant tại một location
   */
  async getAtp(
    locationId: string,
    variantId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const balance = await this.getBalance(locationId, variantId, tx);
    return balance ? balance.availableQuantity : 0;
  }

  /**
   * Truy vấn hàng loạt ATP của nhiều variants tại một location
   * Trả về Map<productVariantId, atp>
   */
  async getBulkAtp(
    locationId: string,
    variantIds: string[],
    tx?: Prisma.TransactionClient,
  ): Promise<Map<string, number>> {
    const atpMap = new Map<string, number>();

    if (!variantIds || variantIds.length === 0) {
      return atpMap;
    }

    // Khởi tạo mặc định ATP = 0 cho tất cả variantIds
    for (const vid of variantIds) {
      atpMap.set(vid, 0);
    }

    const client = this.getClient(tx);
    const records = await client.inventory.findMany({
      where: {
        storeId: locationId,
        productVariantId: { in: variantIds },
      },
    });

    for (const record of records) {
      const atp = this.atpCalculator.calculateAtp({
        physicalOnHand: record.quantity,
        reservedQuantity: record.reservedQuantity,
        safetyStock: record.safetyStock,
        quarantinedQuantity: record.quarantinedQuantity,
        damagedQuantity: record.damagedQuantity,
      });
      atpMap.set(record.productVariantId, atp);
    }

    return atpMap;
  }

  /**
   * Kiểm tra xem location có đủ số lượng ATP cho danh sách items yêu cầu hay không
   */
  async checkAvailability(
    locationId: string,
    items: { variantId: string; quantity: number }[],
    tx?: Prisma.TransactionClient,
  ): Promise<AvailabilityCheckResult> {
    const variantIds = items.map((i) => i.variantId);
    const atpMap = await this.getBulkAtp(locationId, variantIds, tx);

    const shortfalls: { variantId: string; required: number; available: number }[] = [];

    for (const item of items) {
      const available = atpMap.get(item.variantId) ?? 0;
      if (available < item.quantity) {
        shortfalls.push({
          variantId: item.variantId,
          required: item.quantity,
          available,
        });
      }
    }

    return {
      isAvailable: shortfalls.length === 0,
      shortfalls,
    };
  }
}
