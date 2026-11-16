import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  Optional,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { IOutboxWriter, OUTBOX_WRITER } from '@modules/async-infrastructure';
import { CodManagementService } from '@modules/finance/application/services/cod-management.service';
import { AuditLogService } from '@core/services/audit-log.service';
import {
  CompletePackingDto,
  CompletePackingResponseDto,
  PackageResponseDto,
  PackageItemResponseDto,
} from '../../presentation/dtos/packing.dto';

@Injectable()
export class PackingService {
  private readonly logger = new Logger(PackingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OUTBOX_WRITER)
    private readonly outboxWriter: IOutboxWriter,
    @Optional()
    private readonly codManagementService?: CodManagementService,
    @Optional()
    private readonly auditLogService?: AuditLogService,
  ) {}

  /**
   * Hoàn thành đóng gói kiện hàng: Ghi nhận kích thước, trọng lượng thực tế,
   * tạo các thực thể Package, PackageItem, Shipment, ShipmentPackage và phát Transactional Outbox Event
   * 
   * Acceptance Criteria:
   * 1. Một FO có thể đóng thành 1 hoặc nhiều packages.
   * 2. Cân nặng và kích thước thực tế được lưu chính xác, không dùng số ước tính.
   */
  async completePacking(
    fulfillmentOrderId: string,
    dto: CompletePackingDto,
    packedById?: string,
  ): Promise<CompletePackingResponseDto> {
    const fo = await this.prisma.fulfillmentOrder.findUnique({
      where: { id: fulfillmentOrderId },
      include: {
        order: {
          include: {
            payments: true,
          },
        },
        items: true,
        packages: {
          include: {
            items: true,
          },
        },
        shipments: {
          include: {
            packages: true,
          },
        },
      },
    });

    if (!fo) {
      throw new NotFoundException(
        `Không tìm thấy FulfillmentOrder với ID: ${fulfillmentOrderId}`,
      );
    }

    // OCC: Kiểm tra version nếu client cung cấp expectedVersion (AC1)
    if (dto.expectedVersion !== undefined && fo.version !== dto.expectedVersion) {
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'CONCURRENT_MODIFICATION_DETECTED',
        message: 'Dữ liệu đơn hàng đã bị cập nhật bởi người dùng khác. Vui lòng tải lại trang.',
      });
    }

    // Idempotency: Nếu đơn đã hoàn thành đóng gói PACKED
    if (fo.status === 'PACKED') {
      const existingShipment = fo.shipments[0];
      this.logger.warn(
        `FulfillmentOrder ${fo.fulfillmentOrderNumber} đã ở trạng thái PACKED. Trả về thông tin đóng gói hiện tại (Idempotent).`,
      );
      return {
        success: true,
        status: 'PACKED',
        packedAt: fo.packedAt || new Date(),
        fulfillmentOrderId: fo.id,
        shipmentId: existingShipment?.id || '',
        shipmentCode: existingShipment?.shipmentCode || '',
        carrierCode:
          existingShipment?.carrierCode ||
          (fo.shippingServiceCode === 'EXPRESS_2H' ? 'AHAMOVE' : 'GHN'),
        totalPackagesCount: fo.packages.length,
        packages: fo.packages.map((pkg) => ({
          id: pkg.id,
          packageCode: pkg.packageCode,
          actualWeightGrams: pkg.actualWeightGrams,
          lengthCm: pkg.lengthCm,
          widthCm: pkg.widthCm,
          heightCm: pkg.heightCm,
          sealedAt: pkg.sealedAt,
          items: pkg.items.map((pi) => ({
            productVariantId: pi.productVariantId,
            quantity: pi.quantity,
          })),
        })),
      };
    }

    // Kiểm tra trạng thái hợp lệ
    if (fo.status !== 'PICKED') {
      throw new BadRequestException(
        `FulfillmentOrder phải ở trạng thái PICKED để thực hiện đóng gói. Trạng thái hiện tại: ${fo.status}`,
      );
    }

    // Kiểm tra danh sách kiện hàng
    if (!dto.packages || dto.packages.length === 0) {
      throw new BadRequestException(
        'Đơn hàng phải có ít nhất 1 kiện hàng (Package)!',
      );
    }

    // AC2: Kiểm tra cân nặng và kích thước thực tế phải lớn hơn 0
    for (let i = 0; i < dto.packages.length; i++) {
      const pkg = dto.packages[i];
      if (!pkg.actualWeightGrams || pkg.actualWeightGrams <= 0) {
        throw new BadRequestException(
          `Kiện hàng #${i + 1} phải có trọng lượng thực tế lớn hơn 0 gram!`,
        );
      }
      if (
        !pkg.lengthCm ||
        pkg.lengthCm <= 0 ||
        !pkg.widthCm ||
        pkg.widthCm <= 0 ||
        !pkg.heightCm ||
        pkg.heightCm <= 0
      ) {
        throw new BadRequestException(
          `Kiện hàng #${i + 1} phải có kích thước thực tế (dài, rộng, cao) lớn hơn 0 cm!`,
        );
      }
      if (!pkg.items || pkg.items.length === 0) {
        throw new BadRequestException(
          `Kiện hàng #${i + 1} phải chứa ít nhất 1 sản phẩm!`,
        );
      }
    }

    // Kiểm tra tính đầy đủ và chính xác của sản phẩm đóng gói đối chiếu với FulfillmentOrder
    const expectedMap = new Map<string, number>();
    for (const item of fo.items) {
      expectedMap.set(
        item.productVariantId,
        (expectedMap.get(item.productVariantId) || 0) + item.quantityRequested,
      );
    }

    const packagedMap = new Map<string, number>();
    for (const pkg of dto.packages) {
      for (const item of pkg.items) {
        if (!expectedMap.has(item.productVariantId)) {
          throw new BadRequestException(
            `ITEM_NOT_FOUND_IN_ORDER: Sản phẩm ${item.productVariantId} không thuộc FulfillmentOrder này!`,
          );
        }
        packagedMap.set(
          item.productVariantId,
          (packagedMap.get(item.productVariantId) || 0) + item.quantity,
        );
      }
    }

    for (const [variantId, expectedQty] of expectedMap.entries()) {
      const packagedQty = packagedMap.get(variantId) || 0;
      if (packagedQty !== expectedQty) {
        throw new BadRequestException(
          `QUANTITY_MISMATCH: Số lượng đóng gói không khớp cho sản phẩm ${variantId}. Yêu cầu: ${expectedQty}, Đã đóng: ${packagedQty}`,
        );
      }
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const shipmentCode = `SHIP-${dateStr}-${randomSuffix}`;
    const carrierCode =
      fo.shippingServiceCode === 'EXPRESS_2H' ? 'AHAMOVE' : 'GHN';

    // Xác định tiền thu hộ COD nếu đơn thanh toán COD (phân bổ theo tỷ lệ nếu tách đơn)
    let codAmount = new Prisma.Decimal(0);
    if (this.codManagementService) {
      try {
        const allocated = await this.codManagementService.calculateFulfillmentOrderCod(fo.id);
        codAmount = new Prisma.Decimal(allocated);
      } catch (err: any) {
        this.logger.warn(`Lỗi khi tính toán COD qua CodManagementService: ${err.message}. Fallback về payment amount.`);
        const codPayment = fo.order.payments.find(
          (p) => p.paymentMethod === 'COD' && p.status === 'PENDING',
        );
        codAmount = codPayment ? codPayment.amount : new Prisma.Decimal(0);
      }
    } else {
      const codPayment = fo.order.payments.find(
        (p) => p.paymentMethod === 'COD' && p.status === 'PENDING',
      );
      codAmount = codPayment ? codPayment.amount : new Prisma.Decimal(0);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Tạo Shipment ở trạng thái PENDING_CREATION
      const shipment = await tx.shipment.create({
        data: {
          orderId: fo.orderId,
          fulfillmentOrderId: fo.id,
          shipmentCode,
          carrierCode,
          carrierServiceCode: fo.shippingServiceCode,
          codAmount,
          shippingFeePaid: new Prisma.Decimal(0),
          status: 'PENDING_CREATION',
        },
      });

      const createdPackages: PackageResponseDto[] = [];

      // 2. Tạo các Package, PackageItem và ShipmentPackage
      for (let i = 0; i < dto.packages.length; i++) {
        const pkgDto = dto.packages[i];
        const pkgCode =
          pkgDto.packageCode || `PKG-${dateStr}-${randomSuffix}-${i + 1}`;

        const pkg = await tx.package.create({
          data: {
            fulfillmentOrderId: fo.id,
            packageCode: pkgCode,
            actualWeightGrams: pkgDto.actualWeightGrams,
            lengthCm: pkgDto.lengthCm,
            widthCm: pkgDto.widthCm,
            heightCm: pkgDto.heightCm,
            packedBy: packedById || null,
            sealedAt: now,
          },
        });

        const createdItems: PackageItemResponseDto[] = [];
        for (const itemDto of pkgDto.items) {
          await tx.packageItem.create({
            data: {
              packageId: pkg.id,
              productVariantId: itemDto.productVariantId,
              quantity: itemDto.quantity,
            },
          });
          createdItems.push({
            productVariantId: itemDto.productVariantId,
            quantity: itemDto.quantity,
          });
        }

        await tx.shipmentPackage.create({
          data: {
            shipmentId: shipment.id,
            packageId: pkg.id,
          },
        });

        createdPackages.push({
          id: pkg.id,
          packageCode: pkg.packageCode,
          actualWeightGrams: pkg.actualWeightGrams,
          lengthCm: pkg.lengthCm,
          widthCm: pkg.widthCm,
          heightCm: pkg.heightCm,
          sealedAt: pkg.sealedAt,
          items: createdItems,
        });
      }

      // 3. Cập nhật FulfillmentOrder sang PACKED
      await tx.fulfillmentOrder.update({
        where: { id: fo.id },
        data: {
          status: 'PACKED',
          packedAt: now,
          version: { increment: 1 },
        },
      });

      // Ghi Universal Audit Log
      if (this.auditLogService) {
        await this.auditLogService.recordTransition(tx, {
          entityType: 'FULFILLMENT_ORDER',
          entityId: fo.id,
          fromStatus: fo.status,
          toStatus: 'PACKED',
          action: 'COMPLETE_PACKING',
          actorType: 'ADMIN_USER',
          actorId: packedById || null,
        });
      }

      // 4. Ghi nhận Transactional Outbox Event SHIPMENT_DISPATCH_REQUESTED
      await this.outboxWriter.record(tx, {
        aggregateType: 'FULFILLMENT_ORDER',
        aggregateId: fo.id,
        eventType: 'SHIPMENT_DISPATCH_REQUESTED',
        payload: {
          fulfillmentOrderId: fo.id,
          orderId: fo.orderId,
          shipmentId: shipment.id,
          shipmentCode: shipment.shipmentCode,
          carrierCode,
          shippingServiceCode: fo.shippingServiceCode,
          totalPackages: createdPackages.length,
          packedAt: now.toISOString(),
        },
      });

      return {
        shipment,
        packages: createdPackages,
      };
    });

    this.logger.log(
      `FulfillmentOrder ${fo.fulfillmentOrderNumber} đóng gói thành công ${result.packages.length} kiện hàng. Shipment: ${result.shipment.shipmentCode}`,
    );

    return {
      success: true,
      status: 'PACKED',
      packedAt: now,
      fulfillmentOrderId: fo.id,
      shipmentId: result.shipment.id,
      shipmentCode: result.shipment.shipmentCode,
      carrierCode,
      totalPackagesCount: result.packages.length,
      packages: result.packages,
    };
  }
}
