import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { OrderStateAggregator } from '@modules/oms/application/services/order-state-aggregator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ShipmentOrchestratorService } from '../../application/services/shipment-orchestrator.service';
import { ShipmentAttemptService } from '../../application/services/shipment-attempt.service';
import { ReturnToOriginService } from '../../application/services/return-to-origin.service';
import {
  DispatchShipmentResponseDto,
  ReconcileShipmentDto,
  ReconcileShipmentResponseDto,
} from '../dtos/dispatch-shipment.dto';
import {
  RecordFailedAttemptDto,
  ShipmentAttemptResponseDto,
} from '../dtos/shipment-attempt.dto';
import {
  ReceiveRtoShipmentDto,
  ReceiveRtoResponseDto,
} from '../dtos/return-to-origin.dto';

@ApiTags('Admin - Shipping & 3PL Dispatch')
@ApiBearerAuth('JWT-auth')
@Controller('admin/shipments')
export class AdminShippingController {
  constructor(
    private readonly shipmentOrchestrator: ShipmentOrchestratorService,
    private readonly shipmentAttemptService: ShipmentAttemptService,
    private readonly returnToOriginService: ReturnToOriginService,
    private readonly prisma: PrismaService,
    @Optional()
    private readonly orderStateAggregator?: OrderStateAggregator,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Tra cứu danh sách vận đơn bưu kiện 3PL',
  })
  async getShipments(
    @Query('carrier') carrier?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const where: any = {};
    if (carrier) {
      where.carrierCode = carrier;
    }
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { shipmentCode: { contains: search, mode: 'insensitive' } },
        { trackingCode: { contains: search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const page = Math.max(1, parseInt(pageStr || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr || '50', 10) || 50));
    const skip = (page - 1) * limit;

    const [total, shipments] = await Promise.all([
      this.prisma.shipment.count({ where }),
      this.prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              orderNumber: true,
              shippingAddress: true,
              customer: {
                select: { fullName: true, phone: true },
              },
            },
          },
          attempts: true,
        },
      }),
    ]);

    const items = shipments.map((s) => {
      const shippingAddr: any = s.order?.shippingAddress;
      const recipientName =
        shippingAddr?.recipientName ||
        shippingAddr?.name ||
        s.order?.customer?.fullName;
      const recipientPhone =
        shippingAddr?.recipientPhone ||
        shippingAddr?.phone ||
        s.order?.customer?.phone;
      const addressLine = shippingAddr?.addressLine || '';
      const ward = shippingAddr?.ward || '';
      const district = shippingAddr?.district || '';
      const city = shippingAddr?.city || '';
      const deliveryAddress = [addressLine, ward, district, city]
        .filter(Boolean)
        .join(', ');

      return {
        id: s.id,
        shipmentCode: s.shipmentCode,
        orderId: s.orderId,
        orderNumber: s.order?.orderNumber,
        carrierCode: s.carrierCode,
        trackingCode: s.trackingCode,
        status: s.status,
        codAmount: Number(s.codAmount || 0),
        shippingFee: Number(s.actualShippingFee || s.shippingFeePaid || 0),
        recipientName,
        recipientPhone,
        deliveryAddress,
        shippingLabelUrl: s.shippingLabelUrl,
        trackingUrl: s.trackingUrl,
        createdAt: s.createdAt.toISOString(),
        attemptCount: s.attempts.length || s.failedAttempts || 0,
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

  @Post(':id/dispatch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Điều phối tạo vận đơn sang đối tác 3PL (GHN/Ahamove/Mock)',
    description:
      'Gửi thông tin kiện hàng và địa chỉ sang đối tác vận chuyển, nhận mã tracking và link in nhãn. Tự động xử lý timeout và chuyển sang CREATION_UNKNOWN nếu đối tác gián đoạn.',
  })
  @ApiResponse({
    status: 200,
    description: 'Kết quả điều phối tạo vận đơn',
    type: DispatchShipmentResponseDto,
  })
  async dispatchShipment(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DispatchShipmentResponseDto> {
    return this.shipmentOrchestrator.dispatchShipment(id);
  }

  @Post(':id/reconcile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đối soát và phục hồi vận đơn bị sự cố CREATION_UNKNOWN',
    description:
      'Sau khi tra cứu đối tác: Nếu có đơn -> chuyển sang CREATED; Nếu chưa có đơn -> đưa về PENDING_CREATION để thử lại an toàn.',
  })
  @ApiResponse({
    status: 200,
    description: 'Kết quả đối soát vận đơn',
    type: ReconcileShipmentResponseDto,
  })
  async reconcileShipment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReconcileShipmentDto,
  ): Promise<ReconcileShipmentResponseDto> {
    return this.shipmentOrchestrator.reconcileCreationUnknown(id, dto);
  }

  @Post(':id/attempts/failed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ghi nhận một lần giao hàng thất bại (Delivery Attempt Failed)',
    description: 'Ghi nhận lần thử giao thất bại. Lần 1 và 2 không hủy đơn hàng; lần 3 kích hoạt chuyển hoàn RETURNING.',
  })
  async recordFailedAttempt(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordFailedAttemptDto,
  ) {
    return this.shipmentAttemptService.recordFailedAttempt(id, dto);
  }

  @Get(':id/attempts')
  @ApiOperation({
    summary: 'Lấy lịch sử các lần thử giao hàng của vận đơn',
  })
  @ApiResponse({
    status: 200,
    type: [ShipmentAttemptResponseDto],
  })
  async getAttempts(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ShipmentAttemptResponseDto[]> {
    return this.shipmentAttemptService.getAttempts(id);
  }

  @Post(':id/receive-rto')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Tiếp nhận kiện hàng chuyển hoàn về kho (Receive RTO)',
    description: 'Nhân viên kho quét mã nhận hàng hoàn. Nếu INTACT -> Nhập lại Sellable Stock; nếu DAMAGED -> Chuyển sang QUARANTINED.',
  })
  @ApiResponse({
    status: 200,
    type: ReceiveRtoResponseDto,
  })
  async receiveRtoShipment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceiveRtoShipmentDto,
  ): Promise<ReceiveRtoResponseDto> {
    return this.returnToOriginService.receiveRtoShipment(id, dto);
  }

  @Post(':id/deliver')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xác nhận kiện hàng đã giao thành công cho khách hàng (DELIVERED)',
  })
  async markDelivered(@Param('id', ParseUUIDPipe) id: string) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id } });
    if (!shipment) throw new NotFoundException('Không tìm thấy vận đơn');
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.shipment.update({
        where: { id },
        data: { status: 'DELIVERED', deliveredAt: now },
      });
      await tx.shipmentEvent.create({
        data: {
          shipmentId: id,
          carrierCode: shipment.carrierCode || 'MOCK',
          eventId: `ADMIN-DELIVER-${Date.now()}`,
          status: 'DELIVERED',
          occurredAt: now,
        },
      });
      if (this.orderStateAggregator) {
        await this.orderStateAggregator.computeOrderStatus(shipment.orderId, tx, {
          note: 'Xác nhận giao hàng thành công từ cổng quản trị',
        });
      }
    });
    return { success: true, status: 'DELIVERED' };
  }
}

