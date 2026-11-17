import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { OutboxWriterService } from '../../../async-infrastructure/outbox/outbox-writer.service';
import {
  CarrierDamageMetricDto,
  CarrierDamageQueryDto,
  CarrierDamageResponseDto,
  LotQualityDetailDto,
  LotQualityReportQueryDto,
  ReturnReasonBreakdownQueryDto,
  ReturnReasonBreakdownResponseDto,
  ReturnReasonItemDto,
} from '../../presentation/dtos/lot-quality-analytics.dto';

@Injectable()
export class LotQualityAnalyticsService {
  private readonly logger = new Logger(LotQualityAnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxWriter: OutboxWriterService,
  ) {}

  /**
   * Báo cáo chất lượng theo lô sản xuất (Lot Quality Report) - FR-09
   * Tính toán tỷ lệ lỗi / hỏng / biến chất theo từng InventoryLot, tự động kích hoạt
   * cảnh báo LOT_DEFECT_ALERT và kiến nghị cách ly (QUARANTINE) khẩn cấp khi vượt ngưỡng.
   */
  async getLotQualityReport(
    query: LotQualityReportQueryDto,
  ): Promise<LotQualityDetailDto[]> {
    const thresholdPercent = query.thresholdPercent ?? 5.0;
    const minReturns = query.minReturns ?? 1;

    const lots = await this.prisma.inventoryLot.findMany({
      where: {
        ...(query.variantId ? { productVariantId: query.variantId } : {}),
        ...(query.locationId ? { locationId: query.locationId } : {}),
      },
      include: {
        variant: {
          include: {
            product: { select: { name: true } },
          },
        },
        location: { select: { id: true, name: true } },
        inventoryDispositions: {
          include: {
            returnItem: true,
          },
        },
        reservationItems: {
          include: {
            reservation: true,
          },
        },
      },
    });

    const report: LotQualityDetailDto[] = [];

    for (const lot of lots) {
      // 1. Tính tổng số lượng đã xuất/bán từ lot
      const shippedReservations = lot.reservationItems.reduce((acc, item) => {
        if (
          !item.reservation.status ||
          item.reservation.status === 'COMMITTED' ||
          item.reservation.status === 'ALLOCATED'
        ) {
          return acc + item.quantity;
        }
        return acc;
      }, 0);

      const totalShippedQuantity = Math.max(
        shippedReservations,
        lot.quantityOnHand + lot.quantityReserved,
        1,
      );

      // 2. Tính số lượng hoàn trả và số lượng lỗi từ InventoryDispositions
      let defectiveQuantity = 0;
      let totalReturnedQuantity = 0;

      for (const disp of lot.inventoryDispositions) {
        totalReturnedQuantity += disp.quantity;
        const isDefective =
          disp.dispositionType === 'SCRAP' ||
          disp.returnItem?.inspectionStatus === 'FAILED' ||
          disp.returnItem?.reasonCode === 'DEFECTIVE' ||
          disp.returnItem?.reasonCode === 'EXPIRED';

        if (isDefective) {
          defectiveQuantity += disp.quantity;
        }
      }

      // Nếu chưa có disposition ghi nhận trực tiếp vào lot, đối chiếu qua ReturnOrderItem của biến thể đó
      if (defectiveQuantity === 0) {
        const variantDefectiveItems = await this.prisma.returnOrderItem.findMany({
          where: {
            productVariantId: lot.productVariantId,
            OR: [
              { reasonCode: 'DEFECTIVE' },
              { reasonCode: 'EXPIRED' },
              { inspectionStatus: 'FAILED' },
              { disposition: 'SCRAP' },
            ],
          },
        });
        if (variantDefectiveItems.length > 0) {
          const sumDefective = variantDefectiveItems.reduce(
            (sum, item) => sum + item.quantity,
            0,
          );
          // Gán tỷ lệ tương ứng theo lot
          defectiveQuantity = Math.min(sumDefective, totalShippedQuantity);
          totalReturnedQuantity = Math.max(totalReturnedQuantity, defectiveQuantity);
        }
      }

      // 3. Tính tỷ lệ lỗi (%)
      const defectRatePercentage = Number(
        ((defectiveQuantity / totalShippedQuantity) * 100).toFixed(2),
      );

      // 4. Đánh giá cảnh báo
      const isAlertTriggered =
        defectiveQuantity >= minReturns && defectRatePercentage >= thresholdPercent;

      let alertSeverity: 'NORMAL' | 'WARNING' | 'CRITICAL' = 'NORMAL';
      let recommendedAction: 'NORMAL' | 'MONITOR' | 'QUARANTINE_LOT_IMMEDIATELY' =
        'NORMAL';

      if (isAlertTriggered) {
        alertSeverity = defectRatePercentage >= 15.0 ? 'CRITICAL' : 'WARNING';
        recommendedAction = 'QUARANTINE_LOT_IMMEDIATELY';

        // Ghi nhận sự kiện Outbox cảnh báo lỗi lô sản xuất
        await this.prisma.outboxEvent.create({
          data: {
            aggregateType: 'INVENTORY_LOT',
            aggregateId: lot.id,
            eventType: 'LOT_DEFECT_ALERT',
            payload: {
              lotId: lot.id,
              batchCode: lot.batchCode,
              sku: lot.variant.sku,
              productName: lot.variant.product.name,
              defectRatePercentage,
              defectiveQuantity,
              totalShippedQuantity,
              thresholdPercent,
              alertSeverity,
              recommendedAction,
              triggeredAt: new Date(),
            },
          },
        });

        this.logger.warn(
          `[LOT_DEFECT_ALERT] Phát hiện tỷ lệ lỗi ${defectRatePercentage}% vượt ngưỡng ${thresholdPercent}% trên lô ${lot.batchCode} (SKU: ${lot.variant.sku})`,
        );
      } else if (defectiveQuantity > 0) {
        recommendedAction = 'MONITOR';
      }

      report.push({
        lotId: lot.id,
        batchCode: lot.batchCode,
        productVariantId: lot.productVariantId,
        sku: lot.variant.sku,
        productName: lot.variant.product.name,
        locationId: lot.locationId,
        locationName: lot.location?.name,
        expiryDate: lot.expiryDate.toISOString(),
        totalShippedQuantity,
        totalReturnedQuantity,
        defectiveQuantity,
        defectRatePercentage,
        isAlertTriggered,
        alertSeverity,
        recommendedAction,
      });
    }

    return report;
  }

  /**
   * Phân tích cơ cấu lý do trả hàng (Return Reason Breakdown)
   * Thống kê tỷ lệ và giá trị tiền hoàn theo từng nhóm lý do (Hỏng hóc, Đổi ý, Dị ứng, Bể vỡ, Giao sai...).
   */
  async getReturnReasonBreakdown(
    query: ReturnReasonBreakdownQueryDto,
  ): Promise<ReturnReasonBreakdownResponseDto> {
    const createdAtFilter: any = {};
    if (query.startDate) createdAtFilter.gte = new Date(query.startDate);
    if (query.endDate) createdAtFilter.lte = new Date(query.endDate);

    const returnItems = await this.prisma.returnOrderItem.findMany({
      where: {
        ...(Object.keys(createdAtFilter).length > 0
          ? { returnOrder: { createdAt: createdAtFilter } }
          : {}),
        ...(query.variantId ? { productVariantId: query.variantId } : {}),
      },
      select: {
        id: true,
        reasonCode: true,
        quantity: true,
        refundAmountPerUnit: true,
      },
    });

    const totalReturns = returnItems.reduce((acc, item) => acc + item.quantity, 0);

    const reasonMap = new Map<
      string,
      { count: number; totalRefundAmount: number }
    >();

    for (const item of returnItems) {
      const current = reasonMap.get(item.reasonCode) ?? {
        count: 0,
        totalRefundAmount: 0,
      };
      const itemRefund = Number(item.refundAmountPerUnit) * item.quantity;
      reasonMap.set(item.reasonCode, {
        count: current.count + item.quantity,
        totalRefundAmount: current.totalRefundAmount + itemRefund,
      });
    }

    let totalRefundValue = 0;
    const reasons: ReturnReasonItemDto[] = [];

    for (const [reasonCode, data] of reasonMap.entries()) {
      totalRefundValue += data.totalRefundAmount;
      const percentage =
        totalReturns > 0
          ? Number(((data.count / totalReturns) * 100).toFixed(2))
          : 0;

      reasons.push({
        reasonCode,
        count: data.count,
        percentage,
        totalRefundAmount: data.totalRefundAmount,
      });
    }

    // Sắp xếp lý do chiếm tỷ trọng cao nhất lên trước
    reasons.sort((a, b) => b.count - a.count);

    return {
      totalReturns,
      totalRefundValue,
      reasons,
    };
  }

  /**
   * So sánh tỷ lệ hư hại trong quá trình vận chuyển giữa các hãng giao vận (Carrier Damage Comparison)
   * Đối chiếu tỷ lệ hàng vỡ hỏng (DAMAGED_IN_TRANSIT) giữa GHN, AHAMOVE...
   */
  async getCarrierDamageComparison(
    query: CarrierDamageQueryDto,
  ): Promise<CarrierDamageResponseDto> {
    const dateFilter: any = {};
    if (query.startDate) dateFilter.gte = new Date(query.startDate);
    if (query.endDate) dateFilter.lte = new Date(query.endDate);

    // 1. Lấy tất cả vận đơn xuất hàng OUTBOUND
    const outboundShipments = await this.prisma.shipment.findMany({
      where: {
        shipmentType: 'OUTBOUND',
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
      },
      select: {
        id: true,
        orderId: true,
        carrierCode: true,
        status: true,
      },
    });

    const carrierShipmentCounts = new Map<string, number>();
    const orderToCarrierMap = new Map<string, string>();

    for (const s of outboundShipments) {
      orderToCarrierMap.set(s.orderId, s.carrierCode);
      const count = carrierShipmentCounts.get(s.carrierCode) ?? 0;
      carrierShipmentCounts.set(s.carrierCode, count + 1);
    }

    // 2. Lấy các sản phẩm hoàn trả do lý do DAMAGED_IN_TRANSIT
    const damagedReturnItems = await this.prisma.returnOrderItem.findMany({
      where: {
        reasonCode: 'DAMAGED_IN_TRANSIT',
        ...(Object.keys(dateFilter).length > 0
          ? { returnOrder: { createdAt: dateFilter } }
          : {}),
      },
      select: {
        id: true,
        quantity: true,
        returnOrder: {
          select: {
            id: true,
            orderId: true,
          },
        },
      },
    });

    const carrierDamagedCounts = new Map<string, number>();

    for (const item of damagedReturnItems) {
      const orderId = item.returnOrder.orderId;
      const carrierCode = orderToCarrierMap.get(orderId) ?? 'UNKNOWN';
      const currentDamaged = carrierDamagedCounts.get(carrierCode) ?? 0;
      carrierDamagedCounts.set(carrierCode, currentDamaged + item.quantity);
    }

    // 3. Tổng hợp danh sách đối tác vận chuyển (ít nhất gồm GHN và AHAMOVE)
    const carriersToReport = new Set<string>([
      'GHN',
      'AHAMOVE',
      ...Array.from(carrierShipmentCounts.keys()),
    ]);
    carriersToReport.delete('UNKNOWN');

    const carriers: CarrierDamageMetricDto[] = [];

    for (const carrierCode of carriersToReport) {
      const totalDeliveredShipments = carrierShipmentCounts.get(carrierCode) ?? 0;
      const damagedReturnsCount = carrierDamagedCounts.get(carrierCode) ?? 0;
      const damageRatePercentage =
        totalDeliveredShipments > 0
          ? Number(((damagedReturnsCount / totalDeliveredShipments) * 100).toFixed(2))
          : 0;

      carriers.push({
        carrierCode,
        totalDeliveredShipments,
        damagedReturnsCount,
        damageRatePercentage,
      });
    }

    // Sắp xếp hãng có lượng vận đơn nhiều nhất lên trước
    carriers.sort((a, b) => b.totalDeliveredShipments - a.totalDeliveredShipments);

    return {
      period: {
        startDate: query.startDate,
        endDate: query.endDate,
      },
      carriers,
    };
  }
}
