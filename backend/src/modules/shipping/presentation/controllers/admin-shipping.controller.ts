import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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
  ) {}

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
}

