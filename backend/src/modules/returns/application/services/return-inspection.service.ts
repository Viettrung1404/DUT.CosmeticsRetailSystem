import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  ReturnOrderStatus,
  ReturnInspectionStatus,
  ReturnDisposition,
  ReturnReasonCode,
} from '../../domain/entities/return-policy.entity';
import { CompleteInspectionDto } from '../../presentation/dtos/complete-inspection.dto';
import { RmaStatusAggregator } from './rma-status-aggregator';
import { InventoryDispositionService } from './inventory-disposition.service';

export interface CompleteInspectionResult {
  inspection: any;
  returnOrder: any;
  overallResult: string;
  newStatus: ReturnOrderStatus;
}

@Injectable()
export class ReturnInspectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryDispositionService: InventoryDispositionService,
    private readonly rmaStatusAggregator: RmaStatusAggregator,
  ) {}

  /**
   * Hoàn tất quy trình kiểm định chất lượng KCS cho đơn hàng hoàn trả (EP15-T01)
   */
  async completeInspection(
    returnOrderId: string,
    inspectorUserId: string,
    dto: CompleteInspectionDto,
  ): Promise<CompleteInspectionResult> {
    // 1. Kiểm tra đơn đổi trả
    const returnOrder = await this.prisma.returnOrder.findUnique({
      where: { id: returnOrderId },
      include: {
        items: true,
        receipts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!returnOrder) {
      throw new NotFoundException(
        `Không tìm thấy đơn yêu cầu hoàn trả với mã: ${returnOrderId}`,
      );
    }

    // 2. Kiểm tra trạng thái hiện tại (chỉ cho phép kiểm định khi hàng đã nhận: RECEIVED hoặc INSPECTING)
    if (
      returnOrder.status !== ReturnOrderStatus.RECEIVED &&
      returnOrder.status !== ReturnOrderStatus.INSPECTING
    ) {
      throw new BadRequestException(
        `Không thể kiểm định đơn đổi trả ở trạng thái '${returnOrder.status}'. Trạng thái hợp lệ phải là RECEIVED hoặc INSPECTING`,
      );
    }

    // 3. Đối chiếu và kiểm tra tính hợp lệ của từng dòng sản phẩm
    const existingItemsMap = new Map<string, any>(
      returnOrder.items.map((i: any) => [i.id, i]),
    );

    for (const itemDto of dto.items) {
      const returnItem = existingItemsMap.get(itemDto.returnItemId);
      if (!returnItem) {
        throw new BadRequestException(
          `Mặt hàng returnItemId '${itemDto.returnItemId}' không thuộc đơn đổi trả này`,
        );
      }

      // AC1: Tổng số lượng passed và failed phải bằng đúng số lượng yêu cầu hoàn trả
      if (itemDto.passedQuantity + itemDto.failedQuantity !== returnItem.quantity) {
        throw new BadRequestException(
          `Tổng số lượng đạt (${itemDto.passedQuantity}) và không đạt (${itemDto.failedQuantity}) phải bằng số lượng hoàn trả (${returnItem.quantity}) cho sản phẩm ${returnItem.id}`,
        );
      }

      // AC2: Ràng buộc mỹ phẩm bóc seal (TC-RMA-05)
      // Nếu lý do là đổi ý (CHANGE_OF_MIND) và tem niêm phong đã bị rách/mở (isSealIntact = false),
      // tuyệt đối KHÔNG được phép tái nhập kho bán lẻ (RESTOCK)
      if (
        (returnItem.reasonCode === ReturnReasonCode.CHANGE_OF_MIND ||
          returnItem.reasonCode === 'CHANGE_OF_MIND') &&
        !itemDto.isSealIntact
      ) {
        if (itemDto.disposition === ReturnDisposition.RESTOCK) {
          throw new BadRequestException(
            'Mỹ phẩm đổi ý (CHANGE_OF_MIND) đã bị bóc seal / mất niêm phong tuyệt đối không được phép tái nhập kho (RESTOCK)',
          );
        }
      }

      // AC3: Ràng buộc kích ứng da / dị ứng theo quyết định DEC-05 (TC-RMA-06)
      // Khách báo dị ứng: dung tích còn lại phải >= 80% (mức hao hụt tối đa 20%) mới được chấp thuận kiểm định
      if (
        returnItem.reasonCode === ReturnReasonCode.ALLERGIC ||
        returnItem.reasonCode === 'ALLERGIC'
      ) {
        if (
          itemDto.remainingPercentage !== undefined &&
          itemDto.remainingPercentage < 80
        ) {
          if (itemDto.passedQuantity > 0) {
            throw new BadRequestException(
              'Chính sách DEC-05 quy định: Khiếu nại kích ứng (ALLERGIC) có dung tích còn lại dưới 80% không đủ điều kiện chấp thuận kiểm định đạt chuẩn',
            );
          }
        }

        // Hàng mỹ phẩm đã qua sử dụng do kích ứng tuyệt đối không được tái nhập kho bán lẻ
        if (itemDto.disposition === ReturnDisposition.RESTOCK) {
          throw new BadRequestException(
            'Mỹ phẩm kích ứng da đã qua sử dụng tuyệt đối không được phép tái nhập kho bán lẻ (RESTOCK)',
          );
        }
      }
    }

    // 4. Tổng hợp trạng thái qua RmaStatusAggregator (EP15-T03)
    const outcomeList = dto.items.map((it) => {
      let inspectionStatus: ReturnInspectionStatus;
      if (it.passedQuantity > 0 && it.failedQuantity === 0) {
        inspectionStatus = ReturnInspectionStatus.PASSED;
      } else if (it.failedQuantity > 0 && it.passedQuantity === 0) {
        inspectionStatus = ReturnInspectionStatus.FAILED;
      } else {
        inspectionStatus = ReturnInspectionStatus.DISPUTED;
      }
      return { inspectionStatus, disposition: it.disposition };
    });

    const aggregation = this.rmaStatusAggregator.aggregate(outcomeList);

    // Xác định kho/cửa hàng hiện đang lưu giữ hàng cách ly (ReturnReceipt.locationId)
    const locationId =
      returnOrder.receipts && returnOrder.receipts.length > 0
        ? returnOrder.receipts[0].locationId
        : returnOrder.dropoffLocationId || returnOrder.storeId;

    // 5. Thực thi Transaction ACID cập nhật toàn bộ hệ thống
    const result = await this.prisma.$transaction(async (tx) => {
      const inspectionCode = this.generateInspectionCode();

      // 5.1 Tạo bản ghi Biên bản kiểm định KCS (return_inspections)
      const inspection = await tx.returnInspection.create({
        data: {
          inspectionCode,
          returnOrderId: returnOrder.id,
          inspectorId: inspectorUserId,
          overallResult: aggregation.overallResult,
          inspectorNotes: dto.inspectorNotes || null,
        },
      });

      // 5.2 Xử lý từng dòng sản phẩm
      for (const itemDto of dto.items) {
        const returnItem = existingItemsMap.get(itemDto.returnItemId)!;
        let itemStatus: ReturnInspectionStatus;
        if (itemDto.passedQuantity > 0 && itemDto.failedQuantity === 0) {
          itemStatus = ReturnInspectionStatus.PASSED;
        } else if (itemDto.failedQuantity > 0 && itemDto.passedQuantity === 0) {
          itemStatus = ReturnInspectionStatus.FAILED;
        } else {
          itemStatus = ReturnInspectionStatus.DISPUTED;
        }

        // Tạo chi tiết kiểm định (return_inspection_items)
        await tx.returnInspectionItem.create({
          data: {
            inspectionId: inspection.id,
            returnItemId: returnItem.id,
            passedQuantity: itemDto.passedQuantity,
            failedQuantity: itemDto.failedQuantity,
            isSealIntact: itemDto.isSealIntact ?? true,
            remainingPercentage: itemDto.remainingPercentage ?? 100,
            disposition: itemDto.disposition,
            reasonDetail: itemDto.reasonDetail || null,
          },
        });

        // Cập nhật trạng thái kiểm định và disposition cho dòng sản phẩm
        await tx.returnOrderItem.update({
          where: { id: returnItem.id },
          data: {
            inspectionStatus: itemStatus,
            disposition: itemDto.disposition,
          },
        });

        // Gọi EP15-T02 để định đoạt tồn kho cách ly
        await this.inventoryDispositionService.executeItemDisposition(tx, {
          locationId,
          productVariantId: returnItem.productVariantId,
          lotId: itemDto.lotId,
          returnItemId: returnItem.id,
          disposition: itemDto.disposition,
          quantity: returnItem.quantity,
          operatorUserId: inspectorUserId,
          notes: itemDto.reasonDetail || dto.inspectorNotes,
        });
      }

      // 5.3 Cập nhật trạng thái tổng thể của đơn hoàn trả
      const updatedReturnOrder = await tx.returnOrder.update({
        where: { id: returnOrder.id },
        data: {
          status: aggregation.returnOrderStatus,
          handledBy: inspectorUserId,
        },
      });

      // 5.4 Ghi log lịch sử trạng thái
      await tx.returnStatusHistory.create({
        data: {
          returnOrderId: returnOrder.id,
          status: aggregation.returnOrderStatus,
          changedBy: inspectorUserId,
          note: `Hoàn tất kiểm định KCS (${aggregation.overallResult})`,
        },
      });

      // 5.5 Ghi nhận sự kiện Outbox (RMA_INSPECTION_COMPLETED)
      await tx.outboxEvent.create({
        data: {
          aggregateType: 'ReturnOrder',
          aggregateId: returnOrder.id,
          eventType: 'RMA_INSPECTION_COMPLETED',
          payload: {
            returnOrderId: returnOrder.id,
            returnCode: returnOrder.returnCode,
            inspectionCode,
            overallResult: aggregation.overallResult,
            status: aggregation.returnOrderStatus,
            inspectorId: inspectorUserId,
            locationId,
            items: dto.items.map((it) => ({
              returnItemId: it.returnItemId,
              disposition: it.disposition,
              passedQuantity: it.passedQuantity,
              failedQuantity: it.failedQuantity,
            })),
          },
        },
      });

      return {
        inspection,
        returnOrder: updatedReturnOrder,
        overallResult: aggregation.overallResult,
        newStatus: aggregation.returnOrderStatus,
      };
    });

    return result;
  }

  /**
   * Lấy thông tin biên bản kiểm định kèm chi tiết của đơn hoàn trả
   */
  async getInspectionByReturnOrderId(returnOrderId: string) {
    const inspection = await this.prisma.returnInspection.findFirst({
      where: { returnOrderId },
      include: {
        inspector: {
          select: { id: true, fullName: true, email: true },
        },
        items: {
          include: {
            returnItem: {
              include: {
                variant: {
                  select: {
                    id: true,
                    sku: true,
                    option1Value: true,
                    product: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!inspection) {
      throw new NotFoundException(
        `Không tìm thấy biên bản kiểm định cho đơn hoàn trả: ${returnOrderId}`,
      );
    }

    return inspection;
  }

  private generateInspectionCode(): string {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `INS-${today}-${randomSuffix}`;
  }
}
