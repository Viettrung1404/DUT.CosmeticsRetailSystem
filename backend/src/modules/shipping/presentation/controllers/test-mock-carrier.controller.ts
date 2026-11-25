import {
  Controller,
  Post,
  Body,
  NotFoundException,
  ForbiddenException,
  Inject,
  Logger,
  Optional,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '@core/decorators/public.decorator';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { IOutboxWriter, OUTBOX_WRITER } from '@modules/async-infrastructure';
import { OrderStateAggregator } from '@modules/oms/application/services/order-state-aggregator';
import {
  TriggerMockStatusDto,
  TriggerMockStatusResponseDto,
} from '../dtos/mock-carrier-trigger.dto';

@ApiTags('Test / Simulation (Dev Only)')
@Controller('test/mock-carrier')
export class TestMockCarrierController {
  private readonly logger = new Logger(TestMockCarrierController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(OUTBOX_WRITER)
    private readonly outboxWriter: IOutboxWriter,
    @Optional()
    private readonly orderStateAggregator?: OrderStateAggregator,
  ) {}

  @Public()
  @Post('trigger-status')
  @ApiOperation({
    summary: 'Mô phỏng 3PL gửi sự kiện webhook cập nhật trạng thái vận đơn (Chỉ dùng cho dev/test)',
    description:
      'Cập nhật trực tiếp trạng thái của Shipment trong cơ sở dữ liệu và ghi nhật ký sự kiện kiểm thử.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật trạng thái giả lập thành công',
    type: TriggerMockStatusResponseDto,
  })
  async triggerStatus(
    @Body() dto: TriggerMockStatusDto,
  ): Promise<TriggerMockStatusResponseDto> {
    const isMockEnabled =
      this.config.get<string>('SHIPPING_MOCK_ENABLED') === 'true' ||
      this.config.get<string>('NODE_ENV') !== 'production' ||
      process.env.NODE_ENV !== 'production';

    if (!isMockEnabled) {
      throw new ForbiddenException(
        'Mock carrier simulation endpoint is only available when SHIPPING_MOCK_ENABLED=true or in non-production environments.',
      );
    }

    const shipment = await this.prisma.shipment.findUnique({
      where: { trackingCode: dto.trackingCode },
    });

    if (!shipment) {
      throw new NotFoundException(
        `Không tìm thấy vận đơn với trackingCode: ${dto.trackingCode}`,
      );
    }

    const now = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    const previousStatus = shipment.status;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Cập nhật trạng thái Shipment
      const updateData: any = {
        status: dto.status,
        updatedAt: now,
      };

      if (dto.status === 'DELIVERED') {
        updateData.deliveredAt = now;
      }
      if (
        (dto.status === 'PICKED_UP' || dto.status === 'IN_TRANSIT') &&
        !shipment.handedOverAt
      ) {
        updateData.handedOverAt = now;
      }
      if (dto.status === 'DELIVERY_FAILED') {
        updateData.failedAttempts = { increment: 1 };
      }

      const updatedShipment = await tx.shipment.update({
        where: { id: shipment.id },
        data: updateData,
      });

      // 2. Ghi nhận ShipmentEvent
      await tx.shipmentEvent.create({
        data: {
          shipmentId: shipment.id,
          carrierCode: shipment.carrierCode || 'MOCK',
          eventId: `MOCK-EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          status: dto.status,
          occurredAt: now,
        },
      });

      // 3. Ghi nhận Transactional Outbox Event
      await this.outboxWriter.record(tx, {
        aggregateType: 'SHIPMENT',
        aggregateId: shipment.id,
        eventType: 'SHIPMENT_STATUS_UPDATED',
        payload: {
          shipmentId: shipment.id,
          shipmentCode: shipment.shipmentCode,
          trackingCode: dto.trackingCode,
          carrierCode: shipment.carrierCode,
          previousStatus,
          newStatus: dto.status,
          occurredAt: now.toISOString(),
          reasonCode: dto.reasonCode || null,
          reasonDetail: dto.reasonDetail || null,
        },
      });

      // 4. Đồng bộ trạng thái đơn hàng cha
      if (this.orderStateAggregator) {
        await this.orderStateAggregator.computeOrderStatus(shipment.orderId, tx, {
          note: `Mô phỏng 3PL cập nhật trạng thái vận đơn (${previousStatus} -> ${dto.status})`,
        });
      }

      return updatedShipment;
    });

    this.logger.log(
      `[MockCarrierSimulation] Đã cập nhật trackingCode=${dto.trackingCode} từ ${previousStatus} sang ${dto.status}`,
    );

    return {
      success: true,
      trackingCode: dto.trackingCode,
      previousStatus,
      newStatus: result.status,
      shipmentId: result.id,
      updatedAt: result.updatedAt,
    };
  }
}
