import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { GetUserDataScopeUseCase } from '@modules/permissions/application/use-cases/get-user-data-scope.use-case';
import { AdminActionMatrixService } from './admin-action-matrix.service';
import {
  TaskQueueQueryDto,
  TaskQueueResponseDto,
  TaskQueueItemDto,
} from '../../presentation/dtos/queue.dto';

@Injectable()
export class FulfillmentQueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userDataScope: GetUserDataScopeUseCase,
    private readonly actionMatrix: AdminActionMatrixService,
  ) {}

  /**
   * Phân giải danh sách storeId mà người dùng được phép truy cập.
   * Trả về null nếu người dùng có quyền toàn hệ thống (bỏ qua lọc theo storeId).
   */
  async getUserAccessibleStoreIds(user: any): Promise<string[] | null> {
    if (!user) {
      return [];
    }

    const isAdmin =
      user.roleName === 'ADMIN' ||
      user.roleName === 'OPERATIONS_MGR' ||
      user.dataScope === 'ALL' ||
      user.dataScope === 'GLOBAL';

    if (isAdmin) {
      return null;
    }

    const userId = user.userId || user.id;
    if (!userId) {
      return [];
    }

    const scope = await this.userDataScope.execute(userId);
    if (scope.type === 'ALL') {
      return null;
    }

    return scope.storeIds || [];
  }

  /**
   * Lấy danh sách nhiệm vụ nhặt hàng (Picking Queue: status = ALLOCATED)
   * DES-07 EP11-T02 AC1: Chỉ nạp đơn ALLOCATED thuộc kho nhân viên phụ trách.
   */
  async getPickingTasks(
    user: any,
    query: TaskQueueQueryDto = {},
  ): Promise<TaskQueueResponseDto> {
    return this.getTaskQueueByStatus('ALLOCATED', user, query, {
      allocatedAt: 'asc',
    });
  }

  /**
   * Lấy danh sách nhiệm vụ đóng gói (Packing Queue: status = PICKED)
   */
  async getPackingTasks(
    user: any,
    query: TaskQueueQueryDto = {},
  ): Promise<TaskQueueResponseDto> {
    return this.getTaskQueueByStatus('PICKED', user, query, {
      pickedAt: 'asc',
    });
  }

  /**
   * Lấy danh sách nhiệm vụ bàn giao vận chuyển (Handover Queue: status = PACKED)
   */
  async getHandoverTasks(
    user: any,
    query: TaskQueueQueryDto = {},
  ): Promise<TaskQueueResponseDto> {
    return this.getTaskQueueByStatus('PACKED', user, query, {
      packedAt: 'asc',
    });
  }

  /**
   * Truy vấn hàng đợi theo trạng thái và phạm vi phân quyền chi nhánh.
   */
  private async getTaskQueueByStatus(
    status: string,
    user: any,
    query: TaskQueueQueryDto,
    orderBy: Record<string, 'asc' | 'desc'>,
  ): Promise<TaskQueueResponseDto> {
    const accessibleStoreIds = await this.getUserAccessibleStoreIds(user);

    // Nếu nhân viên không được gán chi nhánh nào -> trả về rỗng ngay lập tức
    if (accessibleStoreIds !== null && accessibleStoreIds.length === 0) {
      return {
        items: [],
        total: 0,
        page: query.page || 1,
        limit: query.limit || 20,
        totalPages: 0,
      };
    }

    const where: any = { status };

    if (query.storeId) {
      if (accessibleStoreIds !== null && !accessibleStoreIds.includes(query.storeId)) {
        throw new ForbiddenException({
          statusCode: 403,
          errorCode: 'LOCATION_SCOPE_UNAUTHORIZED',
          message: 'Bạn không có quyền truy cập dữ liệu của chi nhánh này.',
        });
      }
      where.sourceLocationId = query.storeId;
    } else if (accessibleStoreIds !== null) {
      where.sourceLocationId = { in: accessibleStoreIds };
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const [total, records] = await Promise.all([
      this.prisma.fulfillmentOrder.count({ where }),
      this.prisma.fulfillmentOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          sourceLocation: {
            select: { id: true, name: true, code: true },
          },
          order: {
            select: {
              orderNumber: true,
              shippingAddress: true,
              customer: {
                select: { fullName: true, phone: true },
              },
            },
          },
        },
      }),
    ]);

    const items: TaskQueueItemDto[] = (records as any[]).map((fo) => {
      const shippingAddr: any = fo.order?.shippingAddress;
      const recipientName =
        shippingAddr?.name ||
        shippingAddr?.recipientName ||
        fo.order?.customer?.fullName;
      const recipientPhone =
        shippingAddr?.phone ||
        shippingAddr?.recipientPhone ||
        fo.order?.customer?.phone;

      return {
        id: fo.id,
        fulfillmentOrderNumber: fo.fulfillmentOrderNumber,
        status: fo.status,
        sourceLocationId: fo.sourceLocationId,
        sourceLocationName: fo.sourceLocation?.name,
        totalItemsCount: fo.totalItemsCount,
        shippingServiceCode: fo.shippingServiceCode,
        assignedPickerId: fo.assignedPickerId,
        orderNumber: fo.order?.orderNumber,
        recipientName,
        recipientPhone,
        deliveryMethod: shippingAddr?.deliveryMethod,
        allocatedAt: fo.allocatedAt,
        pickedAt: fo.pickedAt,
        packedAt: fo.packedAt,
        availableActions: this.actionMatrix.getAvailableActions(fo, user),
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Lấy chi tiết đơn FulfillmentOrder kèm danh mục hành động khả dụng (DES-07 EP11-T02 AC2).
   */
  async getFulfillmentOrderDetail(id: string, user?: any) {
    const fo = await this.prisma.fulfillmentOrder.findUnique({
      where: { id },
      include: {
        sourceLocation: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            shippingAddress: true,
            status: true,
            customer: {
              select: { fullName: true, phone: true },
            },
          },
        },
        items: {
          include: {
            variant: {
              select: {
                id: true,
                sku: true,
                barcode: true,
                product: { select: { id: true, name: true } },
              },
            },
            orderItem: true,
          },
        },
        packages: true,
        shipments: true,
        reservation: true,
      },
    });

    if (!fo) {
      throw new NotFoundException(`Không tìm thấy FulfillmentOrder với ID: ${id}`);
    }

    const availableActions = this.actionMatrix.getAvailableActions(fo, user);
    const actionDetails = this.actionMatrix.getActionDetails(fo, user);

    return {
      ...fo,
      availableActions,
      actionDetails,
    };
  }
}
