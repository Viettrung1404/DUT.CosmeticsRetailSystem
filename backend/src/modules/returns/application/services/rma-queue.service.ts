import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  ReturnOrderStatus,
  ReturnChannel,
} from '../../domain/entities/return-policy.entity';
import {
  RmaQueueQueryDto,
  RmaQueueSortBy,
  SortOrder,
  RmaQueueSummaryDto,
} from '../../presentation/dtos/rma-queue.dto';
import { RmaActionMatrixService } from './rma-action-matrix.service';

export interface RmaQueueResponse {
  data: any[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  queueName: 'REVIEW' | 'DROPOFF' | 'INSPECTION' | 'SETTLEMENT';
}

@Injectable()
export class RmaQueueService {
  private readonly logger = new Logger(RmaQueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rmaActionMatrixService: RmaActionMatrixService,
  ) {}

  /**
   * 1. Hàng đợi CSKH thẩm tra hồ sơ mới nộp (EP18-T01, Queue: REVIEW)
   * Lọc các hồ sơ ở trạng thái SUBMITTED
   */
  async getReviewQueue(
    query: RmaQueueQueryDto,
    userContext?: any,
  ): Promise<RmaQueueResponse> {
    const whereCondition: any = {
      status: ReturnOrderStatus.SUBMITTED,
    };

    return this.queryQueue(whereCondition, query, 'REVIEW', userContext);
  }

  /**
   * 2. Hàng đợi Showroom tiếp nhận hàng khách mang tới (EP18-T01, Queue: DROPOFF)
   * Lọc các hồ sơ ở trạng thái AWAITING_RETURN hoặc APPROVED với kênh STORE_DROPOFF
   * Tự động áp dụng Location Scope: Nhân viên Showroom chỉ thấy đơn tại chi nhánh mình (AC1)
   */
  async getDropoffQueue(
    query: RmaQueueQueryDto,
    userContext?: any,
  ): Promise<RmaQueueResponse> {
    const whereCondition: any = {
      status: ReturnOrderStatus.APPROVED,
      returnChannel: ReturnChannel.STORE_DROPOFF,
    };

    // Phân quyền theo chi nhánh Showroom:
    // Nếu user thuộc một cửa hàng cụ thể (Store Manager / Staff), ghi đè dropoffLocationId
    const effectiveLocationId = userContext?.storeId || query.dropoffLocationId;
    if (effectiveLocationId) {
      whereCondition.dropoffLocationId = effectiveLocationId;
    }

    return this.queryQueue(whereCondition, query, 'DROPOFF', userContext);
  }

  /**
   * 3. Hàng đợi Chuyên viên KCS thẩm định chất lượng (EP18-T01, Queue: INSPECTION)
   * Lọc các kiện hàng hoàn đã tiếp nhận tại kho/showroom ở trạng thái RECEIVED
   */
  async getInspectionQueue(
    query: RmaQueueQueryDto,
    userContext?: any,
  ): Promise<RmaQueueResponse> {
    const whereCondition: any = {
      status: ReturnOrderStatus.RECEIVED,
    };

    if (query.dropoffLocationId) {
      whereCondition.dropoffLocationId = query.dropoffLocationId;
    }

    return this.queryQueue(whereCondition, query, 'INSPECTION', userContext);
  }

  /**
   * 4. Hàng đợi Phòng Tài chính quyết toán hoàn tiền & đổi hàng (EP18-T01, Queue: SETTLEMENT)
   * Lọc các hồ sơ kiểm định hoàn tất đạt chuẩn ở trạng thái RESOLUTION_PENDING
   */
  async getSettlementQueue(
    query: RmaQueueQueryDto,
    userContext?: any,
  ): Promise<RmaQueueResponse> {
    const whereCondition: any = {
      status: ReturnOrderStatus.RESOLUTION_PENDING,
    };

    return this.queryQueue(whereCondition, query, 'SETTLEMENT', userContext);
  }

  /**
   * Thống kê tổng số lượng hồ sơ đang chờ xử lý trên cả 4 hàng đợi công việc
   */
  async getQueueSummary(userContext?: any): Promise<RmaQueueSummaryDto> {
    const dropoffWhere: any = {
      status: ReturnOrderStatus.APPROVED,
      returnChannel: ReturnChannel.STORE_DROPOFF,
    };

    if (userContext?.storeId) {
      dropoffWhere.dropoffLocationId = userContext.storeId;
    }

    const [reviewCount, dropoffCount, inspectionCount, settlementCount] =
      await Promise.all([
        this.prisma.returnOrder.count({
          where: { status: ReturnOrderStatus.SUBMITTED },
        }),
        this.prisma.returnOrder.count({
          where: dropoffWhere,
        }),
        this.prisma.returnOrder.count({
          where: { status: ReturnOrderStatus.RECEIVED },
        }),
        this.prisma.returnOrder.count({
          where: { status: ReturnOrderStatus.RESOLUTION_PENDING },
        }),
      ]);

    return {
      reviewCount,
      dropoffCount,
      inspectionCount,
      settlementCount,
      totalPending:
        reviewCount + dropoffCount + inspectionCount + settlementCount,
    };
  }

  /**
   * Hàm truy vấn hàng đợi dùng chung với phân trang, tìm kiếm và sắp xếp SLA
   */
  private async queryQueue(
    baseWhere: any,
    query: RmaQueueQueryDto,
    queueName: 'REVIEW' | 'DROPOFF' | 'INSPECTION' | 'SETTLEMENT',
    userContext?: any,
  ): Promise<RmaQueueResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = { ...baseWhere };

    // Lọc theo từ khóa tìm kiếm (search keyword)
    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { returnCode: { contains: term, mode: 'insensitive' } },
        { order: { orderNumber: { contains: term, mode: 'insensitive' } } },
        { customer: { fullName: { contains: term, mode: 'insensitive' } } },
        { customer: { phone: { contains: term } } },
      ];
    }

    // Thiết lập sắp xếp (Ưu tiên SLA: đơn cũ nhất lên đầu) (AC2)
    let orderBy: any = { createdAt: 'desc' };
    if (query.sortBy === RmaQueueSortBy.SLA) {
      orderBy = { createdAt: 'asc' }; // Đơn chờ lâu nhất lên đầu xử lý trước
    } else if (query.sortBy === RmaQueueSortBy.UPDATED_AT) {
      orderBy = { updatedAt: query.sortOrder === SortOrder.ASC ? 'asc' : 'desc' };
    } else {
      orderBy = { createdAt: query.sortOrder === SortOrder.ASC ? 'asc' : 'desc' };
    }

    const [total, returns] = await Promise.all([
      this.prisma.returnOrder.count({ where }),
      this.prisma.returnOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              createdAt: true,
            },
          },
          dropoffLocation: {
            select: {
              id: true,
              code: true,
              name: true,
              address: true,
            },
          },
          items: {
            include: {
              variant: {
                select: {
                  id: true,
                  sku: true,
                  price: true,
                  product: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          receipts: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              receiptCode: true,
              createdAt: true,
              packageConditionNote: true,
            },
          },
          inspections: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              inspectionCode: true,
              overallResult: true,
              createdAt: true,
            },
          },
          settlement: {
            select: {
              id: true,
              status: true,
              returnCredit: true,
              replacementPayable: true,
              creditApplied: true,
              additionalDue: true,
              refundDue: true,
            },
          },
          refunds: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              amount: true,
              status: true,
            },
          },
        },
      }),
    ]);

    // Gắn thêm ma trận hành động khả dụng (availableActions) cho từng bản ghi
    const enrichedData = returns.map((item) => ({
      ...item,
      availableActions: this.rmaActionMatrixService.getAvailableActions(item),
    }));

    return {
      data: enrichedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      queueName,
    };
  }
}
