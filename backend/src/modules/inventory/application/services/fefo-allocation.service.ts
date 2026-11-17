import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface AllocationItemRequest {
  variantId: string;
  quantity: number;
  /**
   * Cờ cho phép xuất hàng xả kho (Clearance).
   * Khi true, sản phẩm cận date (dưới min_shelf_life_days) vẫn được phép phân bổ miễn là chưa hết hạn (HSD > now).
   */
  isClearance?: boolean;
}

export interface AllocatedLotItem {
  lotId: string;
  variantId: string;
  batchCode: string;
  expiryDate: Date;
  quantity: number;
}

export interface FefoAllocationOptions {
  /**
   * Mốc thời gian đối chiếu (mặc định là thời điểm hiện tại `new Date()`).
   * Hữu ích cho việc giả lập thời gian trong test cases.
   */
  now?: Date;
  /**
   * Thời hạn lưu thông tối thiểu mặc định (ngày) nếu variant không có cấu hình. Mặc định 180 ngày.
   */
  defaultMinShelfLifeDays?: number;
}

export interface AllocationSimulationResult {
  canFulfill: boolean;
  allocations: AllocatedLotItem[];
  shortfalls: {
    variantId: string;
    requestedQuantity: number;
    allocatedQuantity: number;
    missingQuantity: number;
  }[];
}

interface CandidateLotRow {
  id: string;
  batch_code: string;
  expiry_date: Date | string;
  quantity_on_hand: number;
  quantity_reserved: number;
}

@Injectable()
export class FefoAllocationService {
  private readonly logger = new Logger(FefoAllocationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Phân bổ và khóa các lô hàng theo nguyên tắc FEFO (First Expired, First Out)
   * và tuân thủ thời hạn lưu thông tối thiểu (Min Remaining Shelf Life).
   * 
   * @param tx Prisma Transaction Client bắt buộc (để bảo đảm Pessimistic Row Lock có hiệu lực)
   * @param locationId ID địa điểm xuất kho (kho tổng hoặc showroom)
   * @param items Danh sách sản phẩm và số lượng cần xuất
   * @param options Tùy chọn cấu hình (thời gian tham chiếu, shelf life mặc định)
   * @returns Danh sách các lô hàng đã được phân bổ và tăng quantity_reserved
   * @throws NotFoundException Nếu không tìm thấy biến thể sản phẩm
   * @throws ConflictException Nếu không đủ số lượng khả dụng đạt chuẩn FEFO
   */
  async allocateAndLockLots(
    tx: Prisma.TransactionClient,
    locationId: string,
    items: AllocationItemRequest[],
    options?: FefoAllocationOptions,
  ): Promise<AllocatedLotItem[]> {
    if (!items || items.length === 0) {
      return [];
    }

    const refNow = options?.now || new Date();
    const defaultShelfLife = options?.defaultMinShelfLifeDays ?? 180;
    const allAllocations: AllocatedLotItem[] = [];

    // 1. Deadlock Prevention Strategy: Sắp xếp items theo variantId tăng dần
    // để bảo đảm tất cả các giao dịch đồng thời khóa các tài nguyên theo cùng một thứ tự nhất quán.
    const sortedItems = [...items].sort((a, b) => a.variantId.localeCompare(b.variantId));

    for (const item of sortedItems) {
      if (item.quantity <= 0) {
        continue;
      }

      let remainingToFulfill = item.quantity;

      // 2. Lấy thời hạn lưu thông tối thiểu của SKU (min_shelf_life_days)
      const minDays = await this.getMinShelfLifeDays(tx, item.variantId, defaultShelfLife);

      // 3. Tính mốc ngày hết hạn tối thiểu chấp nhận được
      let earliestAcceptableExpiry: Date;
      if (item.isClearance) {
        // Hàng clearance: Chỉ cần chưa hết date hôm nay
        earliestAcceptableExpiry = new Date(refNow);
      } else {
        // Hàng tiêu chuẩn: Phải còn ít nhất minDays ngày lưu thông
        earliestAcceptableExpiry = new Date(refNow.getTime() + minDays * 86_400_000);
      }

      // 4. Khóa các lô khả dụng theo thứ tự FEFO (expiry_date ASC, id ASC) bằng Pessimistic Lock
      const candidateLots = await tx.$queryRaw<CandidateLotRow[]>`
        SELECT id, batch_code, expiry_date, quantity_on_hand, quantity_reserved
        FROM inventory_lots
        WHERE location_id = ${locationId}::uuid
          AND product_variant_id = ${item.variantId}::uuid
          AND expiry_date >= ${earliestAcceptableExpiry}::date
          AND (quantity_on_hand - quantity_reserved) > 0
        ORDER BY expiry_date ASC, id ASC
        FOR UPDATE
      `;

      // 5. Phân bổ từng lô theo hạn dùng tăng dần
      for (const lot of candidateLots) {
        if (remainingToFulfill <= 0) {
          break;
        }

        const lotAvailable = lot.quantity_on_hand - lot.quantity_reserved;
        if (lotAvailable <= 0) {
          continue;
        }

        const allocatedQty = Math.min(lotAvailable, remainingToFulfill);

        // Cập nhật tăng quantity_reserved trên lô hàng trong cùng transaction
        await tx.inventoryLot.update({
          where: { id: lot.id },
          data: {
            quantityReserved: { increment: allocatedQty },
          },
        });

        allAllocations.push({
          lotId: lot.id,
          variantId: item.variantId,
          batchCode: lot.batch_code,
          expiryDate: new Date(lot.expiry_date),
          quantity: allocatedQty,
        });

        remainingToFulfill -= allocatedQty;
      }

      // 6. Kiểm tra xem có đủ số lượng khả dụng không
      if (remainingToFulfill > 0) {
        this.logger.warn(
          `LOT_SHORTAGE: Không đủ tồn kho FEFO cho variant ${item.variantId} tại location ${locationId}. Còn thiếu ${remainingToFulfill}/${item.quantity}.`,
        );
        throw new ConflictException(
          `LOT_SHORTAGE_FOR_VARIANT_${item.variantId}: Không đủ tồn kho đạt chuẩn FEFO (còn thiếu ${remainingToFulfill} sản phẩm)`,
        );
      }
    }

    return allAllocations;
  }

  /**
   * Giải phóng số lượng giữ chỗ trên các lô hàng đã phân bổ trước đó (dùng khi hủy đơn hoặc timeout).
   * 
   * @param tx Prisma Transaction Client
   * @param allocations Danh sách các phân bổ cần giải phóng
   */
  async releaseLockedLots(
    tx: Prisma.TransactionClient,
    allocations: { lotId: string; quantity: number }[],
  ): Promise<void> {
    if (!allocations || allocations.length === 0) {
      return;
    }

    for (const alloc of allocations) {
      if (alloc.quantity <= 0) {
        continue;
      }

      const currentLot = await tx.inventoryLot.findUnique({
        where: { id: alloc.lotId },
        select: { quantityReserved: true },
      });

      const decQty = currentLot
        ? Math.min(alloc.quantity, Math.max(0, currentLot.quantityReserved))
        : alloc.quantity;

      if (decQty > 0) {
        await tx.inventoryLot.update({
          where: { id: alloc.lotId },
          data: {
            quantityReserved: { decrement: decQty },
          },
        });
      }
    }
  }

  /**
   * Mô phỏng phân bổ FEFO ở chế độ chỉ đọc (Read-only Dry-run)
   * Không thực hiện khóa dòng (FOR UPDATE) và không cập nhật dữ liệu.
   * Dùng cho Routing Engine / Order Split Engine đánh giá khả năng hoàn tất đơn hàng tại một địa điểm.
   */
  async simulateAllocation(
    locationId: string,
    items: AllocationItemRequest[],
    options?: FefoAllocationOptions,
  ): Promise<AllocationSimulationResult> {
    const refNow = options?.now || new Date();
    const defaultShelfLife = options?.defaultMinShelfLifeDays ?? 180;
    const allocations: AllocatedLotItem[] = [];
    const shortfalls: AllocationSimulationResult['shortfalls'] = [];

    for (const item of items) {
      if (item.quantity <= 0) continue;

      let remainingToFulfill = item.quantity;
      let allocatedForThisItem = 0;

      const minDays = await this.getMinShelfLifeDays(this.prisma, item.variantId, defaultShelfLife);
      const earliestAcceptableExpiry = item.isClearance
        ? new Date(refNow)
        : new Date(refNow.getTime() + minDays * 86_400_000);

      const candidateLots = await this.prisma.$queryRaw<CandidateLotRow[]>`
        SELECT id, batch_code, expiry_date, quantity_on_hand, quantity_reserved
        FROM inventory_lots
        WHERE location_id = ${locationId}::uuid
          AND product_variant_id = ${item.variantId}::uuid
          AND expiry_date >= ${earliestAcceptableExpiry}::date
          AND (quantity_on_hand - quantity_reserved) > 0
        ORDER BY expiry_date ASC, id ASC
      `;

      for (const lot of candidateLots) {
        if (remainingToFulfill <= 0) break;
        const lotAvailable = lot.quantity_on_hand - lot.quantity_reserved;
        if (lotAvailable <= 0) continue;

        const allocatedQty = Math.min(lotAvailable, remainingToFulfill);
        allocations.push({
          lotId: lot.id,
          variantId: item.variantId,
          batchCode: lot.batch_code,
          expiryDate: new Date(lot.expiry_date),
          quantity: allocatedQty,
        });

        remainingToFulfill -= allocatedQty;
        allocatedForThisItem += allocatedQty;
      }

      if (remainingToFulfill > 0) {
        shortfalls.push({
          variantId: item.variantId,
          requestedQuantity: item.quantity,
          allocatedQuantity: allocatedForThisItem,
          missingQuantity: remainingToFulfill,
        });
      }
    }

    return {
      canFulfill: shortfalls.length === 0,
      allocations,
      shortfalls,
    };
  }

  /**
   * Truy vấn cấu hình thời hạn lưu thông tối thiểu (min_shelf_life_days) của biến thể sản phẩm.
   */
  async getMinShelfLifeDays(
    client: Prisma.TransactionClient | PrismaService,
    variantId: string,
    defaultDays: number = 180,
  ): Promise<number> {
    const variant = await client.productVariant.findUnique({
      where: { id: variantId },
      select: { minShelfLifeDays: true },
    });

    if (!variant) {
      throw new NotFoundException(`Không tìm thấy biến thể sản phẩm với ID: ${variantId}`);
    }

    return variant.minShelfLifeDays ?? defaultDays;
  }
}
