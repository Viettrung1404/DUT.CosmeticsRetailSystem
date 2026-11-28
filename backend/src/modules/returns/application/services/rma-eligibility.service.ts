import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  AllowedReturnRuleDto,
  ItemEligibilityDto,
  OrderEligibilityResultDto,
} from '../../presentation/dtos/return-eligibility.dto';
import { ReturnPolicyRuleProps } from '../../domain/entities/return-policy.entity';

@Injectable()
export class RmaEligibilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Kiểm tra điều kiện đổi trả của đơn hàng theo phiên bản chính sách hiệu lực
   * @param orderId ID đơn hàng cần kiểm tra
   * @param customerId ID khách hàng sở hữu đơn (bảo mật tránh kiểm tra chéo)
   * @param now Thời điểm đánh giá (mặc định là thời điểm hiện tại)
   */
  async checkOrderEligibility(
    orderId: string,
    customerId: string,
    now: Date = new Date(),
  ): Promise<OrderEligibilityResultDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    categoryId: true,
                    images: true,
                  },
                },
              },
            },
          },
        },
        shipments: {
          select: {
            id: true,
            status: true,
            deliveredAt: true,
            updatedAt: true,
          },
        },
        policyVersion: {
          include: {
            rules: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID: ${orderId}`);
    }

    if (order.customerId !== customerId) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập hoặc thao tác trên đơn hàng này',
      );
    }

    // 1. Kiểm tra trạng thái đơn hàng (chỉ cho phép DELIVERED hoặc COMPLETED)
    const validDeliveredStatuses = ['DELIVERED', 'COMPLETED'];
    if (!validDeliveredStatuses.includes(order.status)) {
      return {
        orderId: order.id,
        orderCode: order.orderNumber,
        deliveredAt: null,
        policyVersionName: order.policyVersion?.versionName || 'N/A',
        isEligible: false,
        ineligibleReasons: ['ORDER_NOT_DELIVERED'],
        items: order.items.map((item) => ({
          orderItemId: item.id,
          productId: item.variant.productId,
          productVariantId: item.productVariantId,
          productName: item.productName,
          variantName: item.variantName,
          sku: item.variant.sku,
          thumbnailUrl: this.extractThumbnail(item.variant.product?.images),
          unitPrice: Number(item.unitPrice),
          purchasedQuantity: item.quantity,
          alreadyReturnedQuantity: 0,
          availableReturnQuantity: 0,
          isEligible: false,
          ineligibleReason: 'ORDER_NOT_DELIVERED',
          allowedRules: [],
        })),
      };
    }

    // 2. Xác định thời điểm giao hàng (deliveredAt)
    let deliveredAt: Date = order.updatedAt;
    const deliveredShipments = order.shipments
      .filter((s) => s.status === 'DELIVERED')
      .sort((a, b) => {
        const timeA = (a.deliveredAt ?? a.updatedAt).getTime();
        const timeB = (b.deliveredAt ?? b.updatedAt).getTime();
        return timeB - timeA;
      });

    if (deliveredShipments.length > 0) {
      deliveredAt =
        deliveredShipments[0].deliveredAt ?? deliveredShipments[0].updatedAt;
    }

    // 3. Xác định Policy Version áp dụng
    let policyVersion = order.policyVersion;
    if (!policyVersion) {
      policyVersion = await this.prisma.returnPolicyVersion.findFirst({
        where: {
          isActive: true,
          effectiveFrom: { lte: order.createdAt },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: order.createdAt } },
          ],
        },
        include: { rules: true },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (!policyVersion) {
        policyVersion = await this.prisma.returnPolicyVersion.findFirst({
          where: { isActive: true },
          include: { rules: true },
          orderBy: { effectiveFrom: 'desc' },
        });
      }
    }

    const policyRules = policyVersion?.rules || [];
    const policyVersionName = policyVersion?.versionName || 'POLICY-DEFAULT';

    // 4. Lấy số lượng đã từng yêu cầu trả trước đó cho từng orderItem
    const existingReturnOrders = await this.prisma.returnOrder.findMany({
      where: {
        orderId: order.id,
        status: { notIn: ['REJECTED', 'CANCELLED'] },
      },
      include: {
        items: true,
      },
    });

    const alreadyReturnedQtyMap: Record<string, number> = {};
    for (const retOrder of existingReturnOrders) {
      for (const retItem of retOrder.items) {
        alreadyReturnedQtyMap[retItem.orderItemId] =
          (alreadyReturnedQtyMap[retItem.orderItemId] || 0) + retItem.quantity;
      }
    }

    // 5. Đánh giá tính hợp lệ của từng Item trong đơn
    const elapsedMs = now.getTime() - deliveredAt.getTime();
    const elapsedDays = Math.max(0, elapsedMs / (1000 * 60 * 60 * 24));

    const itemResults: ItemEligibilityDto[] = [];
    const orderIneligibleReasonsSet = new Set<string>();

    for (const item of order.items) {
      const alreadyReturned = alreadyReturnedQtyMap[item.id] || 0;
      const availableReturnQty = Math.max(0, item.quantity - alreadyReturned);
      const categoryId = item.variant.product?.categoryId;

      if (availableReturnQty <= 0) {
        itemResults.push({
          orderItemId: item.id,
          productId: item.variant.productId,
          productVariantId: item.productVariantId,
          productName: item.productName,
          variantName: item.variantName,
          sku: item.variant.sku,
          thumbnailUrl: this.extractThumbnail(item.variant.product?.images),
          unitPrice: Number(item.unitPrice),
          purchasedQuantity: item.quantity,
          alreadyReturnedQuantity: alreadyReturned,
          availableReturnQuantity: 0,
          isEligible: false,
          ineligibleReason: 'DUPLICATE_RMA_PENDING',
          allowedRules: [],
        });
        orderIneligibleReasonsSet.add('DUPLICATE_RMA_PENDING');
        continue;
      }

      // Lọc các rule phù hợp với category của sản phẩm (nếu có rule theo category thì ưu tiên hơn rule chung)
      const allowedRules: AllowedReturnRuleDto[] = [];
      const reasonCodeMap = new Map<string, ReturnPolicyRuleProps>();

      for (const rule of policyRules) {
        if (rule.categoryId === categoryId) {
          reasonCodeMap.set(rule.reasonCode, rule as ReturnPolicyRuleProps);
        } else if (!rule.categoryId && !reasonCodeMap.has(rule.reasonCode)) {
          reasonCodeMap.set(rule.reasonCode, rule as ReturnPolicyRuleProps);
        }
      }

      for (const rule of reasonCodeMap.values()) {
        if (elapsedDays <= rule.windowDays) {
          const daysRemaining = Math.max(
            0,
            Math.ceil(rule.windowDays - elapsedDays),
          );
          allowedRules.push({
            reasonCode: rule.reasonCode,
            windowDays: rule.windowDays,
            daysRemaining,
            requiresOriginalSeal: rule.requiresOriginalSeal,
            maxUsagePercentage: rule.maxUsagePercentage,
            shippingFeeBearer: rule.shippingFeeBearer,
            requiresEvidenceVideo: rule.requiresEvidenceVideo,
            requiresEvidenceImage: rule.requiresEvidenceImage,
            allowStoreDropoff: rule.allowStoreDropoff,
            allowCarrierPickup: rule.allowCarrierPickup,
            requiresManualReview: rule.requiresManualReview,
          });
        }
      }

      const isItemEligible = allowedRules.length > 0;
      let ineligibleReason: string | undefined = undefined;

      if (!isItemEligible) {
        ineligibleReason = 'RETURN_WINDOW_EXPIRED';
        orderIneligibleReasonsSet.add('RETURN_WINDOW_EXPIRED');
      }

      itemResults.push({
        orderItemId: item.id,
        productId: item.variant.productId,
        productVariantId: item.productVariantId,
        productName: item.productName,
        variantName: item.variantName,
        sku: item.variant.sku,
        thumbnailUrl: this.extractThumbnail(item.variant.product?.images),
        unitPrice: Number(item.unitPrice),
        purchasedQuantity: item.quantity,
        alreadyReturnedQuantity: alreadyReturned,
        availableReturnQuantity: availableReturnQty,
        isEligible: isItemEligible,
        ineligibleReason,
        allowedRules,
      });
    }

    const orderIsEligible = itemResults.some((item) => item.isEligible);
    const orderIneligibleReasons = orderIsEligible
      ? []
      : Array.from(orderIneligibleReasonsSet);

    return {
      orderId: order.id,
      orderCode: order.orderNumber,
      deliveredAt,
      policyVersionName,
      isEligible: orderIsEligible,
      ineligibleReasons: orderIneligibleReasons,
      items: itemResults,
    };
  }

  private extractThumbnail(images: any): string | null {
    if (Array.isArray(images) && images.length > 0 && typeof images[0] === 'string') {
      return images[0];
    }
    return null;
  }
}
