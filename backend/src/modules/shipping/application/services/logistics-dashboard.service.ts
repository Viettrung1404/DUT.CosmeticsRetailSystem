import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { DashboardFilterDto } from '../../presentation/dtos/logistics-dashboard.dto';

export interface FirstAttemptDeliveryMetric {
  totalDelivered: number;
  firstAttemptSuccessCount: number;
  multiAttemptCount: number;
  firstAttemptRatePercentage: number;
}

export interface ExpressSlaMetric {
  totalExpress: number;
  onTimeCount: number;
  breachedCount: number;
  breachRatePercentage: number;
  onTimeRatePercentage: number;
  avgDeliveryTimeMinutes: number;
}

export interface CodReconciliationCarrierSummary {
  carrierCode: string;
  totalShipments: number;
  totalCodExpected: number;
  totalCodCollected: number;
  totalCodReconciled: number;
  discrepancyAmount: number;
}

export interface CodReconciliationHeatmapMetric {
  overallDiscrepancy: number;
  totalCodExpected: number;
  totalCodCollected: number;
  totalCodReconciled: number;
  byCarrier: CodReconciliationCarrierSummary[];
}

export interface LocationThroughput {
  locationId: string;
  locationCode: string;
  locationName: string;
  locationType: string;
  totalOrders: number;
  allocatedCount: number;
  pickedCount: number;
  packedCount: number;
  handedOverCount: number;
}

export interface FulfillmentThroughputMetric {
  totalFulfillmentOrders: number;
  byLocation: LocationThroughput[];
}

export interface DashboardOverview {
  generatedAt: Date;
  dateRange: {
    startDate?: string;
    endDate?: string;
  };
  firstAttemptDelivery: FirstAttemptDeliveryMetric;
  express2hSla: ExpressSlaMetric;
  codReconciliation: CodReconciliationHeatmapMetric;
  fulfillmentThroughput: FulfillmentThroughputMetric;
}

@Injectable()
export class LogisticsDashboardService {
  private readonly logger = new Logger(LogisticsDashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper build điều kiện thời gian
   */
  private buildDateFilter(filter?: DashboardFilterDto) {
    const where: any = {};
    if (filter?.startDate || filter?.endDate) {
      where.createdAt = {};
      if (filter.startDate) {
        where.createdAt.gte = new Date(filter.startDate);
      }
      if (filter.endDate) {
        where.createdAt.lte = new Date(filter.endDate);
      }
    }
    return where;
  }

  /**
   * 1. Tỷ lệ giao hàng thành công lần đầu (First-attempt Delivery Rate)
   */
  async getFirstAttemptDeliveryRate(
    filter?: DashboardFilterDto,
  ): Promise<FirstAttemptDeliveryMetric> {
    const dateWhere = this.buildDateFilter(filter);

    const deliveredShipments = await this.prisma.shipment.findMany({
      where: {
        ...dateWhere,
        status: 'DELIVERED',
        ...(filter?.carrierCode ? { carrierCode: filter.carrierCode } : {}),
      },
      select: {
        id: true,
        failedAttempts: true,
      },
    });

    const totalDelivered = deliveredShipments.length;
    if (totalDelivered === 0) {
      return {
        totalDelivered: 0,
        firstAttemptSuccessCount: 0,
        multiAttemptCount: 0,
        firstAttemptRatePercentage: 100,
      };
    }

    const firstAttemptSuccessCount = deliveredShipments.filter(
      (s) => s.failedAttempts === 0,
    ).length;
    const multiAttemptCount = totalDelivered - firstAttemptSuccessCount;
    const firstAttemptRatePercentage =
      Math.round((firstAttemptSuccessCount / totalDelivered) * 10000) / 100;

    return {
      totalDelivered,
      firstAttemptSuccessCount,
      multiAttemptCount,
      firstAttemptRatePercentage,
    };
  }

  /**
   * 2. Tỷ lệ vi phạm cam kết giao hỏa tốc 2H (2H Express SLA Breach Rate)
   */
  async getExpressSlaMetrics(
    filter?: DashboardFilterDto,
  ): Promise<ExpressSlaMetric> {
    const dateWhere = this.buildDateFilter(filter);
    const now = new Date();

    const expressShipments = await this.prisma.shipment.findMany({
      where: {
        ...dateWhere,
        OR: [
          { carrierCode: 'AHAMOVE' },
          { carrierServiceCode: 'EXPRESS_2H' },
          { carrierServiceCode: { contains: 'EXPRESS', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        deliveredAt: true,
      },
    });

    const totalExpress = expressShipments.length;
    if (totalExpress === 0) {
      return {
        totalExpress: 0,
        onTimeCount: 0,
        breachedCount: 0,
        breachRatePercentage: 0,
        onTimeRatePercentage: 100,
        avgDeliveryTimeMinutes: 0,
      };
    }

    let breachedCount = 0;
    let totalDeliveryMinutes = 0;
    let deliveredCount = 0;

    for (const s of expressShipments) {
      if (s.status === 'DELIVERED' && s.deliveredAt) {
        deliveredCount++;
        const durationMin = Math.floor(
          (s.deliveredAt.getTime() - s.createdAt.getTime()) / (1000 * 60),
        );
        totalDeliveryMinutes += Math.max(0, durationMin);
        if (durationMin > 120) {
          breachedCount++;
        }
      } else if (['PENDING', 'CREATED', 'IN_TRANSIT'].includes(s.status)) {
        const elapsedMin = Math.floor(
          (now.getTime() - s.createdAt.getTime()) / (1000 * 60),
        );
        if (elapsedMin > 120) {
          breachedCount++;
        }
      }
    }

    const onTimeCount = totalExpress - breachedCount;
    const breachRatePercentage =
      Math.round((breachedCount / totalExpress) * 10000) / 100;
    const onTimeRatePercentage =
      Math.round((onTimeCount / totalExpress) * 10000) / 100;
    const avgDeliveryTimeMinutes =
      deliveredCount > 0 ? Math.round(totalDeliveryMinutes / deliveredCount) : 0;

    return {
      totalExpress,
      onTimeCount,
      breachedCount,
      breachRatePercentage,
      onTimeRatePercentage,
      avgDeliveryTimeMinutes,
    };
  }

  /**
   * 3. Báo cáo đối soát COD & Heatmap lệch cước
   */
  async getCodReconciliationHeatmap(
    filter?: DashboardFilterDto,
  ): Promise<CodReconciliationHeatmapMetric> {
    const dateWhere = this.buildDateFilter(filter);

    const codShipments = await this.prisma.shipment.findMany({
      where: {
        ...dateWhere,
        codAmount: { gt: 0 },
        ...(filter?.carrierCode ? { carrierCode: filter.carrierCode } : {}),
      },
      select: {
        carrierCode: true,
        codAmount: true,
        codStatus: true,
        status: true,
      },
    });

    const carrierMap = new Map<
      string,
      {
        totalShipments: number;
        totalExpected: number;
        totalCollected: number;
        totalReconciled: number;
      }
    >();

    let overallExpected = 0;
    let overallCollected = 0;
    let overallReconciled = 0;

    for (const s of codShipments) {
      const carrier = s.carrierCode || 'UNKNOWN';
      if (!carrierMap.has(carrier)) {
        carrierMap.set(carrier, {
          totalShipments: 0,
          totalExpected: 0,
          totalCollected: 0,
          totalReconciled: 0,
        });
      }

      const entry = carrierMap.get(carrier)!;
      entry.totalShipments++;

      const amount = Number(s.codAmount);
      entry.totalExpected += amount;
      overallExpected += amount;

      if (
        s.codStatus === 'COD_COLLECTED' ||
        s.codStatus === 'COD_RECONCILED' ||
        s.status === 'DELIVERED'
      ) {
        entry.totalCollected += amount;
        overallCollected += amount;
      }

      if (s.codStatus === 'COD_RECONCILED') {
        entry.totalReconciled += amount;
        overallReconciled += amount;
      }
    }

    const byCarrier: CodReconciliationCarrierSummary[] = Array.from(
      carrierMap.entries(),
    ).map(([carrierCode, data]) => ({
      carrierCode,
      totalShipments: data.totalShipments,
      totalCodExpected: data.totalExpected,
      totalCodCollected: data.totalCollected,
      totalCodReconciled: data.totalReconciled,
      discrepancyAmount: data.totalCollected - data.totalReconciled,
    }));

    return {
      overallDiscrepancy: overallCollected - overallReconciled,
      totalCodExpected: overallExpected,
      totalCodCollected: overallCollected,
      totalCodReconciled: overallReconciled,
      byCarrier,
    };
  }

  /**
   * 4. Năng suất hoàn tất đơn hàng (Fulfillment Throughput)
   */
  async getFulfillmentThroughput(
    filter?: DashboardFilterDto,
  ): Promise<FulfillmentThroughputMetric> {
    const dateWhere = this.buildDateFilter(filter);

    const [orders, stores] = await Promise.all([
      this.prisma.fulfillmentOrder.findMany({
        where: {
          ...dateWhere,
          ...(filter?.locationId
            ? { sourceLocationId: filter.locationId }
            : {}),
        },
        select: {
          sourceLocationId: true,
          status: true,
        },
      }),
      this.prisma.store.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
        },
      }),
    ]);

    const storeMap = new Map(stores.map((s) => [s.id, s]));

    const locationMap = new Map<
      string,
      {
        total: number;
        allocated: number;
        picked: number;
        packed: number;
        handedOver: number;
      }
    >();

    for (const fo of orders) {
      const locId = fo.sourceLocationId || 'UNASSIGNED';
      if (!locationMap.has(locId)) {
        locationMap.set(locId, {
          total: 0,
          allocated: 0,
          picked: 0,
          packed: 0,
          handedOver: 0,
        });
      }

      const stats = locationMap.get(locId)!;
      stats.total++;

      switch (fo.status) {
        case 'ALLOCATED':
          stats.allocated++;
          break;
        case 'PICKING':
        case 'PICKED':
          stats.picked++;
          break;
        case 'PACKING':
        case 'PACKED':
          stats.packed++;
          break;
        case 'HANDED_OVER':
        case 'COMPLETED':
          stats.handedOver++;
          break;
      }
    }

    const byLocation: LocationThroughput[] = Array.from(
      locationMap.entries(),
    ).map(([locationId, stats]) => {
      const store = storeMap.get(locationId);
      return {
        locationId,
        locationCode: store?.code || 'N/A',
        locationName: store?.name || 'Điểm không xác định',
        locationType: store?.type || 'UNKNOWN',
        totalOrders: stats.total,
        allocatedCount: stats.allocated,
        pickedCount: stats.picked,
        packedCount: stats.packed,
        handedOverCount: stats.handedOver,
      };
    });

    return {
      totalFulfillmentOrders: orders.length,
      byLocation,
    };
  }

  /**
   * 5. Tổng quan Dashboard Logistics thời gian thực (Unified Dashboard Overview)
   */
  async getDashboardOverview(
    filter?: DashboardFilterDto,
  ): Promise<DashboardOverview> {
    const [
      firstAttemptDelivery,
      express2hSla,
      codReconciliation,
      fulfillmentThroughput,
    ] = await Promise.all([
      this.getFirstAttemptDeliveryRate(filter),
      this.getExpressSlaMetrics(filter),
      this.getCodReconciliationHeatmap(filter),
      this.getFulfillmentThroughput(filter),
    ]);

    return {
      generatedAt: new Date(),
      dateRange: {
        startDate: filter?.startDate,
        endDate: filter?.endDate,
      },
      firstAttemptDelivery,
      express2hSla,
      codReconciliation,
      fulfillmentThroughput,
    };
  }
}
