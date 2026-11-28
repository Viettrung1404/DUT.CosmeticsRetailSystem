import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { OutboxWriterService } from '../../../async-infrastructure/outbox/outbox-writer.service';
import { RmaEligibilityService } from '../services/rma-eligibility.service';
import {
  SubmitReturnRequestDto,
} from '../../presentation/dtos/submit-return-request.dto';
import {
  ReturnChannel,
  ReturnOrderStatus,
  ReturnInspectionStatus,
} from '../../domain/entities/return-policy.entity';

@Injectable()
export class SubmitReturnRequestUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rmaEligibilityService: RmaEligibilityService,
    private readonly outboxWriter: OutboxWriterService,
  ) {}

  async execute(customerId: string, dto: SubmitReturnRequestDto) {
    // 1. Kiểm tra tính hợp lệ của đơn hàng và từng sản phẩm qua Eligibility Service
    const eligibility = await this.rmaEligibilityService.checkOrderEligibility(
      dto.orderId,
      customerId,
    );

    if (!eligibility.isEligible) {
      throw new BadRequestException(
        `Đơn hàng không đủ điều kiện đổi trả: ${eligibility.ineligibleReasons.join(', ')}`,
      );
    }

    // 2. Xác thực từng sản phẩm trong yêu cầu đổi trả
    for (const itemDto of dto.items) {
      const eligibleItem = eligibility.items.find(
        (i) => i.orderItemId === itemDto.orderItemId,
      );

      if (!eligibleItem) {
        throw new BadRequestException(
          `Sản phẩm với orderItemId ${itemDto.orderItemId} không thuộc đơn hàng này`,
        );
      }

      if (!eligibleItem.isEligible) {
        throw new BadRequestException(
          `Sản phẩm "${eligibleItem.productName}" không đủ điều kiện đổi trả: ${eligibleItem.ineligibleReason}`,
        );
      }

      if (itemDto.quantity > eligibleItem.availableReturnQuantity) {
        throw new BadRequestException(
          `Số lượng yêu cầu trả (${itemDto.quantity}) vượt quá số lượng tối đa khả dụng (${eligibleItem.availableReturnQuantity}) cho sản phẩm "${eligibleItem.productName}"`,
        );
      }

      // Kiểm tra quy tắc đối với lý do tương ứng
      const matchedRule = eligibleItem.allowedRules.find(
        (r) => r.reasonCode === itemDto.reasonCode,
      );

      if (!matchedRule) {
        throw new BadRequestException(
          `Lý do "${itemDto.reasonCode}" không áp dụng được cho sản phẩm "${eligibleItem.productName}" hoặc đã hết thời hạn đổi trả`,
        );
      }

      // Kiểm tra yêu cầu video (bắt buộc đối với DAMAGED_IN_TRANSIT / DEFECTIVE theo quy tắc)
      if (matchedRule.requiresEvidenceVideo && !itemDto.evidenceVideoUrl) {
        throw new BadRequestException(
          `Lý do "${itemDto.reasonCode}" cho sản phẩm "${eligibleItem.productName}" bắt buộc phải có video quay bằng chứng khui kiện hàng / lỗi sản phẩm`,
        );
      }

      // Kiểm tra yêu cầu hình ảnh
      if (
        matchedRule.requiresEvidenceImage &&
        (!itemDto.evidenceImages || itemDto.evidenceImages.length === 0)
      ) {
        throw new BadRequestException(
          `Sản phẩm "${eligibleItem.productName}" bắt buộc phải có ít nhất 1 hình ảnh bằng chứng`,
        );
      }
    }

    // 3. Xác thực kênh tiếp nhận hoàn trả
    const channel = dto.returnChannel || ReturnChannel.CARRIER_PICKUP;
    dto.returnChannel = channel;

    if (channel === ReturnChannel.STORE_DROPOFF) {
      if (!dto.dropoffLocationId) {
        throw new BadRequestException(
          'Vui lòng chọn Showroom để mang sản phẩm đến đổi trả',
        );
      }
      const store = await this.prisma.store.findUnique({
        where: { id: dto.dropoffLocationId },
      });
      if (!store) {
        throw new NotFoundException(
          `Không tìm thấy Showroom tiếp nhận với ID: ${dto.dropoffLocationId}`,
        );
      }
    } else if (channel === ReturnChannel.CARRIER_PICKUP) {
      if (!dto.pickupAddress || typeof dto.pickupAddress !== 'object') {
        const order = await this.prisma.order.findUnique({
          where: { id: dto.orderId },
          select: { shippingAddress: true },
        });
        if (order?.shippingAddress && typeof order.shippingAddress === 'object') {
          dto.pickupAddress = order.shippingAddress as Record<string, any>;
        } else {
          throw new BadRequestException(
            'Vui lòng cung cấp địa chỉ chi tiết để bưu tá đến thu hồi sản phẩm',
          );
        }
      }
    }

    // 4. Sinh mã hồ sơ đổi trả duy nhất (RET-YYYYMMDD-XXXX)
    const returnCode = this.generateReturnCode();

    // 5. Thực thi Transaction ACID: Tạo ReturnOrder, ReturnOrderItems và Ghi Outbox Event
    const createdReturn = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: dto.orderId },
        select: {
          storeId: true,
          policyVersionId: true,
        },
      });

      const primaryReason =
        dto.items.length === 1
          ? dto.items[0].reasonCode
          : Array.from(new Set(dto.items.map((i) => i.reasonCode))).join(', ');

      const returnOrder = await tx.returnOrder.create({
        data: {
          returnCode,
          orderId: dto.orderId,
          customerId,
          storeId: order!.storeId,
          returnType: 'REFUND',
          status: ReturnOrderStatus.SUBMITTED,
          reason: primaryReason,
          refundAmount: 0,
          policyVersionId: order?.policyVersionId,
          dropoffLocationId:
            dto.returnChannel === ReturnChannel.STORE_DROPOFF
              ? dto.dropoffLocationId
              : null,
          pickupAddress:
            dto.returnChannel === ReturnChannel.CARRIER_PICKUP
              ? (dto.pickupAddress as any)
              : null,
          returnChannel: dto.returnChannel,
          customerNote: dto.customerNote,
          items: {
            create: dto.items.map((it) => {
              const eligItem = eligibility.items.find(
                (ei) => ei.orderItemId === it.orderItemId,
              )!;
              return {
                orderItemId: it.orderItemId,
                productVariantId: eligItem.productVariantId,
                quantity: it.quantity,
                reasonCode: it.reasonCode,
                customerNote: it.customerNote,
                evidenceImages: it.evidenceImages as any,
                evidenceVideoUrl: it.evidenceVideoUrl,
                inspectionStatus: ReturnInspectionStatus.PENDING,
                refundAmountPerUnit: eligItem.unitPrice,
              };
            }),
          },
        },
        include: {
          items: {
            include: {
              variant: true,
            },
          },
          order: {
            select: {
              orderNumber: true,
            },
          },
        },
      });

      // Ghi nhận Outbox Event phục vụ truyền thông bất đồng bộ
      await this.outboxWriter.record(tx, {
        aggregateType: 'RETURN_ORDER',
        aggregateId: returnOrder.id,
        eventType: 'RMA_REQUEST_SUBMITTED',
        payload: {
          returnOrderId: returnOrder.id,
          returnCode: returnOrder.returnCode,
          orderId: returnOrder.orderId,
          orderNumber: returnOrder.order.orderNumber,
          customerId: returnOrder.customerId,
          returnChannel: returnOrder.returnChannel,
          itemsCount: returnOrder.items.length,
          reasons: primaryReason,
          submittedAt: returnOrder.createdAt.toISOString(),
        },
      });

      return returnOrder;
    });

    return createdReturn;
  }

  private generateReturnCode(): string {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `RET-${today}-${randomSuffix}`;
  }
}
