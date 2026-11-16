import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  Logger,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { IOutboxWriter, OUTBOX_WRITER } from '@modules/async-infrastructure';
import {
  IShippingProvider,
  SHIPPING_PROVIDER,
  SHIPPING_PROVIDERS,
} from '../../domain/ports/shipping-provider.interface';
import {
  CreateShipmentDto,
  ShipmentType,
  ShippingContactDto,
  ParcelDimensionsDto,
  ShipmentItemDto,
} from '../../domain/dtos/shipping-provider.dto';
import {
  DispatchShipmentResponseDto,
  ReconcileShipmentDto,
  ReconcileShipmentResponseDto,
} from '../../presentation/dtos/dispatch-shipment.dto';

export interface DispatchOptions {
  timeoutMs?: number;
}

const DEFAULT_DISPATCH_TIMEOUT_MS = 15000; // 15s theo DES-06 / DES-07

@Injectable()
export class ShipmentOrchestratorService {
  private readonly logger = new Logger(ShipmentOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SHIPPING_PROVIDER)
    private readonly shippingProvider: IShippingProvider,
    @Inject(OUTBOX_WRITER)
    private readonly outboxWriter: IOutboxWriter,
    @Optional()
    @Inject(SHIPPING_PROVIDERS)
    private readonly shippingProviders?: Map<string, IShippingProvider>,
  ) {}

  private getProviderForCarrier(carrierCode?: string | null): IShippingProvider {
    if (carrierCode && this.shippingProviders && this.shippingProviders.has(carrierCode.toUpperCase())) {
      return this.shippingProviders.get(carrierCode.toUpperCase())!;
    }
    return this.shippingProvider;
  }

  /**
   * Điều phối tạo vận đơn sang đối tác 3PL sau khi đóng gói.
   * Áp dụng mẫu khôi phục sự cố CREATION_UNKNOWN và xử lý timeout an toàn.
   *
   * Acceptance Criteria:
   * 1. Timeout (>15s) không làm crash luồng nghiệp vụ kho.
   * 2. Trạng thái CREATION_UNKNOWN ngăn chặn nhân viên bấm tạo lại đơn ngay lập tức.
   */
  async dispatchShipment(
    shipmentId: string,
    options?: DispatchOptions,
  ): Promise<DispatchShipmentResponseDto> {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        order: true,
        fulfillmentOrder: {
          include: {
            items: {
              include: {
                variant: true,
              },
            },
          },
        },
        packages: {
          include: {
            package: {
              include: {
                items: {
                  include: {
                    variant: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Không tìm thấy Shipment với ID: ${shipmentId}`);
    }

    // 1. Idempotency Guard: Nếu đơn đã được tạo thành công
    if (shipment.status === 'CREATED' || shipment.trackingCode) {
      this.logger.warn(
        `Shipment ${shipment.shipmentCode} đã ở trạng thái ${shipment.status} với mã tracking: ${shipment.trackingCode}. Trả về thông tin hiện tại (Idempotent).`,
      );
      return {
        success: true,
        status: shipment.status,
        shipmentId: shipment.id,
        shipmentCode: shipment.shipmentCode,
        trackingCode: shipment.trackingCode || undefined,
        carrierReferenceId: shipment.carrierReferenceId,
        shippingLabelUrl: shipment.shippingLabelUrl,
      };
    }

    // 2. Chặn tạo lại khi đang ở trạng thái CREATION_UNKNOWN (AC2)
    if (shipment.status === 'CREATION_UNKNOWN') {
      throw new BadRequestException(
        `SHIPMENT_CREATION_UNKNOWN: Vận đơn ${shipment.shipmentCode} đang ở trạng thái CREATION_UNKNOWN do gián đoạn kết nối với hãng. Bắt buộc thực hiện đối soát (reconcile) trước khi tạo lại!`,
      );
    }

    // 3. Chỉ cho phép dispatch khi ở trạng thái PENDING_CREATION
    if (shipment.status !== 'PENDING_CREATION') {
      throw new BadRequestException(
        `SHIPMENT_INVALID_STATUS: Vận đơn chỉ có thể dispatch khi ở trạng thái PENDING_CREATION (Trạng thái hiện tại: ${shipment.status}).`,
      );
    }

    // 4. Lấy thông tin Store (điểm xuất phát)
    let sender: ShippingContactDto = {
      name: 'Kho Tong GlowUp Tan Binh',
      phone: '0901234567',
      addressLine: '123 Cong Hoa',
      district: 'Tan Binh',
      province: 'TP Ho Chi Minh',
    };

    if (shipment.fulfillmentOrder?.sourceLocationId) {
      const store = await this.prisma.store.findUnique({
        where: { id: shipment.fulfillmentOrder.sourceLocationId },
      });
      if (store) {
        sender = {
          name: store.name,
          phone: store.phone || '0901234567',
          addressLine: store.address,
          district: store.district,
          province: store.city,
          latitude: store.latitude ? Number(store.latitude) : undefined,
          longitude: store.longitude ? Number(store.longitude) : undefined,
        };
      }
    }

    // 5. Lấy thông tin Recipient (từ Order.shippingAddress)
    const rawAddress = (shipment.order?.shippingAddress || {}) as Record<string, any>;
    const recipient: ShippingContactDto = {
      name: rawAddress.fullName || rawAddress.recipientName || 'Khach Hang',
      phone: rawAddress.phone || rawAddress.recipientPhone || '0987654321',
      addressLine: rawAddress.addressLine || rawAddress.street || 'Dia chi giao hang',
      ward: rawAddress.ward,
      district: rawAddress.district || 'Quan',
      province: rawAddress.city || rawAddress.province || 'Tinh',
    };

    // 6. Tổng hợp trọng lượng và kích thước từ các Package thực tế
    let totalWeightGrams = 0;
    let maxLen = 10;
    let maxWid = 10;
    let totalHeight = 10;
    const items: ShipmentItemDto[] = [];

    if (shipment.packages && shipment.packages.length > 0) {
      for (const sp of shipment.packages) {
        const pkg = sp.package;
        totalWeightGrams += pkg.actualWeightGrams || 0;
        maxLen = Math.max(maxLen, pkg.lengthCm || 10);
        maxWid = Math.max(maxWid, pkg.widthCm || 10);
        totalHeight += pkg.heightCm || 10;

        for (const pi of pkg.items) {
          items.push({
            productVariantId: pi.productVariantId,
            sku: pi.variant?.sku,
            name: pi.variant?.sku || 'San pham my pham',
            quantity: pi.quantity,
            weightGrams: pi.variant?.weight ? Number(pi.variant.weight) : 100,
          });
        }
      }
    } else if (shipment.fulfillmentOrder?.items) {
      for (const foItem of shipment.fulfillmentOrder.items) {
        const itemWeight = foItem.variant?.weight ? Number(foItem.variant.weight) : 100;
        items.push({
          productVariantId: foItem.productVariantId,
          sku: foItem.variant?.sku,
          name: foItem.variant?.sku || 'San pham my pham',
          quantity: foItem.quantityRequested,
          weightGrams: itemWeight,
        });
        totalWeightGrams += itemWeight * foItem.quantityRequested;
      }
    }

    const parcel: ParcelDimensionsDto = {
      weightGrams: Math.max(100, totalWeightGrams),
      lengthCm: maxLen,
      widthCm: maxWid,
      heightCm: totalHeight,
    };

    const createShipmentDto: CreateShipmentDto = {
      shipmentCode: shipment.shipmentCode,
      clientOrderCode: shipment.shipmentCode,
      orderNumber: shipment.order?.orderNumber,
      shipmentType: (shipment.shipmentType as ShipmentType) || 'OUTBOUND',
      carrierCode: shipment.carrierCode,
      serviceCode: shipment.carrierServiceCode || undefined,
      sender,
      recipient,
      parcel,
      items,
      codAmountVnd: Number(shipment.codAmount || 0),
    };

    // 7. Gọi 3PL Provider với timeout protection (15s mặc định)
    const timeoutMs = options?.timeoutMs || DEFAULT_DISPATCH_TIMEOUT_MS;
    let timedOut = false;
    let timeoutTimer: NodeJS.Timeout | null = null;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutTimer = setTimeout(() => {
        timedOut = true;
        reject(
          new Error(
            `3PL_DISPATCH_TIMEOUT: Quá ${timeoutMs / 1000} giây không nhận được phản hồi từ hãng vận chuyển ${shipment.carrierCode}`,
          ),
        );
      }, timeoutMs);
    });

    try {
      this.logger.log(
        `Đang gọi 3PL dispatch cho shipment ${shipment.shipmentCode} qua carrier ${shipment.carrierCode}...`,
      );

      const targetProvider = this.getProviderForCarrier(shipment.carrierCode);
      const result = await Promise.race([
        targetProvider.createShipment(createShipmentDto),
        timeoutPromise,
      ]);

      if (timeoutTimer) clearTimeout(timeoutTimer);

      // 8. Cập nhật thành công trạng thái CREATED
      const updatedShipment = await this.prisma.$transaction(async (tx) => {
        const s = await tx.shipment.update({
          where: { id: shipment.id },
          data: {
            trackingCode: result.trackingCode,
            carrierReferenceId: result.carrierReferenceId || null,
            carrierServiceCode: result.carrierServiceCode || shipment.carrierServiceCode,
            shippingLabelUrl: result.shippingLabelUrl || null,
            trackingUrl: result.trackingUrl || null,
            actualShippingFee: result.actualFeeVnd
              ? new Prisma.Decimal(result.actualFeeVnd)
              : shipment.actualShippingFee,
            status: 'CREATED',
            carrierMetadata: (result.rawResponse as any) || undefined,
          },
        });

        // Ghi Transactional Outbox Event
        await this.outboxWriter.record(tx, {
          aggregateType: 'SHIPMENT',
          aggregateId: shipment.id,
          eventType: 'SHIPMENT_CREATED',
          payload: {
            shipmentId: shipment.id,
            shipmentCode: shipment.shipmentCode,
            trackingCode: result.trackingCode,
            carrierCode: shipment.carrierCode,
            status: 'CREATED',
            createdAt: new Date().toISOString(),
          },
        });

        return s;
      });

      this.logger.log(
        `Dispatch thành công shipment ${shipment.shipmentCode}: trackingCode=${result.trackingCode}`,
      );

      return {
        success: true,
        status: 'CREATED',
        shipmentId: updatedShipment.id,
        shipmentCode: updatedShipment.shipmentCode,
        trackingCode: updatedShipment.trackingCode!,
        carrierReferenceId: updatedShipment.carrierReferenceId,
        shippingLabelUrl: updatedShipment.shippingLabelUrl,
        trackingUrl: updatedShipment.trackingUrl,
      };
    } catch (err: any) {
      if (timeoutTimer) clearTimeout(timeoutTimer);

      this.logger.error(
        `Dispatch thất bại cho shipment ${shipment.shipmentCode}: ${err.message}. Đặt status = CREATION_UNKNOWN`,
        err.stack,
      );

      // Cập nhật trạng thái sang CREATION_UNKNOWN
      await this.prisma.$transaction(async (tx) => {
        await tx.shipment.update({
          where: { id: shipment.id },
          data: {
            status: 'CREATION_UNKNOWN',
            carrierMetadata: {
              error: err.message,
              failedAt: new Date().toISOString(),
              isTimeout: timedOut,
            },
          },
        });

        await this.outboxWriter.record(tx, {
          aggregateType: 'SHIPMENT',
          aggregateId: shipment.id,
          eventType: 'SHIPMENT_CREATION_UNKNOWN',
          payload: {
            shipmentId: shipment.id,
            shipmentCode: shipment.shipmentCode,
            carrierCode: shipment.carrierCode,
            status: 'CREATION_UNKNOWN',
            errorMessage: err.message,
            isTimeout: timedOut,
            failedAt: new Date().toISOString(),
          },
        });
      });

      // AC1: Không throw exception làm crash luồng nghiệp vụ kho
      return {
        success: false,
        status: 'CREATION_UNKNOWN',
        shipmentId: shipment.id,
        shipmentCode: shipment.shipmentCode,
        errorMessage: err.message,
        isTimeout: timedOut,
      };
    }
  }

  /**
   * Đối soát trạng thái vận đơn CREATION_UNKNOWN
   * Sau khi đối tác xác nhận có hay chưa có đơn, chuyển sang CREATED hoặc trả về PENDING_CREATION để tạo lại.
   */
  async reconcileCreationUnknown(
    shipmentId: string,
    dto?: ReconcileShipmentDto,
  ): Promise<ReconcileShipmentResponseDto> {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) {
      throw new NotFoundException(`Không tìm thấy Shipment với ID: ${shipmentId}`);
    }

    if (shipment.status !== 'CREATION_UNKNOWN') {
      throw new BadRequestException(
        `Chỉ có thể đối soát các vận đơn ở trạng thái CREATION_UNKNOWN (Trạng thái hiện tại: ${shipment.status}).`,
      );
    }

    const carrierFound = dto?.carrierFound ?? false;
    const now = new Date();

    if (carrierFound) {
      // Hãng xác nhận đã nhận đơn và có mã tracking
      const trackingCode =
        dto?.trackingCode ||
        shipment.trackingCode ||
        `RECON-${shipment.carrierCode}-${Date.now().toString().slice(-6)}`;

      const updated = await this.prisma.$transaction(async (tx) => {
        const s = await tx.shipment.update({
          where: { id: shipment.id },
          data: {
            status: 'CREATED',
            trackingCode,
            updatedAt: now,
          },
        });

        await this.outboxWriter.record(tx, {
          aggregateType: 'SHIPMENT',
          aggregateId: shipment.id,
          eventType: 'SHIPMENT_RECONCILED_CREATED',
          payload: {
            shipmentId: shipment.id,
            shipmentCode: shipment.shipmentCode,
            trackingCode,
            status: 'CREATED',
            reconciledAt: now.toISOString(),
          },
        });

        return s;
      });

      this.logger.log(
        `Đối soát thành công cho shipment ${shipment.shipmentCode}: chuyển sang CREATED với mã ${trackingCode}`,
      );

      return {
        success: true,
        status: 'CREATED',
        shipmentId: updated.id,
        shipmentCode: updated.shipmentCode,
        trackingCode: updated.trackingCode,
        message: 'Đối soát thành công: Đơn đã được xác nhận tồn tại trên hệ thống 3PL.',
      };
    } else {
      // Hãng xác nhận chưa nhận đơn: Cho phép reset về PENDING_CREATION để thử tạo lại an toàn
      const updated = await this.prisma.$transaction(async (tx) => {
        const s = await tx.shipment.update({
          where: { id: shipment.id },
          data: {
            status: 'PENDING_CREATION',
            updatedAt: now,
          },
        });

        await this.outboxWriter.record(tx, {
          aggregateType: 'SHIPMENT',
          aggregateId: shipment.id,
          eventType: 'SHIPMENT_RESET_TO_PENDING',
          payload: {
            shipmentId: shipment.id,
            shipmentCode: shipment.shipmentCode,
            status: 'PENDING_CREATION',
            reconciledAt: now.toISOString(),
          },
        });

        return s;
      });

      this.logger.log(
        `Đối soát shipment ${shipment.shipmentCode}: Chưa có trên hệ thống 3PL. Đã reset về PENDING_CREATION.`,
      );

      return {
        success: true,
        status: 'PENDING_CREATION',
        shipmentId: updated.id,
        shipmentCode: updated.shipmentCode,
        message:
          'Đối soát hoàn tất: Hãng xác nhận chưa nhận đơn. Vận đơn đã được đưa về PENDING_CREATION để thử lại an toàn.',
      };
    }
  }
}
