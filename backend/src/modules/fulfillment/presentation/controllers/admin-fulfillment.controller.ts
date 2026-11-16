import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { LocationScoped } from '@core/decorators/location-scoped.decorator';
import { RequireAnyPermission } from '@core/decorators/require-permissions.decorator';
import { PickingService } from '../../application/services/picking.service';
import { PackingService } from '../../application/services/packing.service';
import { HandoverService } from '../../application/services/handover.service';
import { FulfillmentQueueService } from '../../application/services/fulfillment-queue.service';
import {
  StartPickingDto,
  CompletePickingDto,
  PickListResponseDto,
} from '../dtos/picking.dto';
import {
  CompletePackingDto,
  CompletePackingResponseDto,
} from '../dtos/packing.dto';
import {
  ConfirmHandoverDto,
  ConfirmHandoverResponseDto,
} from '../dtos/handover.dto';

@ApiTags('Admin - Fulfillment & WMS Operations')
@ApiBearerAuth('JWT-auth')
@Controller('admin/fulfillment-orders')
export class AdminFulfillmentController {
  constructor(
    private readonly pickingService: PickingService,
    private readonly packingService: PackingService,
    private readonly handoverService: HandoverService,
    private readonly queueService: FulfillmentQueueService,
  ) {}

  @Get(':id')
  @LocationScoped({ resourceType: 'FULFILLMENT_ORDER', paramName: 'id' })
  @RequireAnyPermission(
    'ORDER_ONLINE_VIEW',
    'ORDER_SHIPMENT_MANAGE',
    'INVENTORY_VIEW',
    'FULFILLMENT_MANAGE',
  )
  @ApiOperation({
    summary: 'Lấy thông tin chi tiết FulfillmentOrder kèm danh mục hành động khả dụng (availableActions)',
  })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết đơn thành công' })
  async getDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.queueService.getFulfillmentOrderDetail(id, user);
  }

  @Get(':id/pick-list')
  @LocationScoped({ resourceType: 'FULFILLMENT_ORDER', paramName: 'id' })
  @RequireAnyPermission(
    'ORDER_ONLINE_VIEW',
    'ORDER_SHIPMENT_MANAGE',
    'INVENTORY_VIEW',
    'FULFILLMENT_PICK',
    'FULFILLMENT_MANAGE',
  )
  @ApiOperation({
    summary: 'Lấy danh sách nhặt hàng (Pick List) kèm mã lô FEFO chỉ định cho FulfillmentOrder',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách nhặt hàng thành công' })
  async getPickList(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PickListResponseDto> {
    return this.pickingService.getPickList(id);
  }

  @Post(':id/start-picking')
  @HttpCode(HttpStatus.OK)
  @LocationScoped({ resourceType: 'FULFILLMENT_ORDER', paramName: 'id' })
  @RequireAnyPermission(
    'ORDER_SHIPMENT_MANAGE',
    'ORDER_STATUS_UPDATE',
    'FULFILLMENT_PICK',
    'FULFILLMENT_MANAGE',
  )
  @ApiOperation({
    summary: 'Bắt đầu quy trình nhặt hàng: Chuyển trạng thái từ ALLOCATED sang PICKING',
  })
  @ApiResponse({ status: 200, description: 'Bắt đầu nhặt hàng thành công' })
  async startPicking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto?: StartPickingDto,
    @CurrentUser('id') userId?: string,
  ) {
    const pickerId = dto?.pickerId || userId;
    return this.pickingService.startPicking(id, pickerId, dto?.expectedVersion);
  }

  @Post(':id/complete-picking')
  @HttpCode(HttpStatus.OK)
  @LocationScoped({ resourceType: 'FULFILLMENT_ORDER', paramName: 'id' })
  @RequireAnyPermission(
    'ORDER_SHIPMENT_MANAGE',
    'ORDER_STATUS_UPDATE',
    'FULFILLMENT_PICK',
    'FULFILLMENT_MANAGE',
  )
  @ApiOperation({
    summary: 'Hoàn thành nhặt hàng: Quét mã vạch và số lô thực tế đối chiếu với FEFO Reservation',
  })
  @ApiResponse({ status: 200, description: 'Hoàn thành nhặt hàng, chuyển sang PICKED' })
  async completePicking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompletePickingDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.pickingService.completePicking(id, dto, userId);
  }

  @Post(':id/complete-packing')
  @HttpCode(HttpStatus.OK)
  @LocationScoped({ resourceType: 'FULFILLMENT_ORDER', paramName: 'id' })
  @RequireAnyPermission(
    'ORDER_SHIPMENT_MANAGE',
    'ORDER_STATUS_UPDATE',
    'FULFILLMENT_PACK',
    'FULFILLMENT_MANAGE',
  )
  @ApiOperation({
    summary: 'Hoàn thành đóng gói: Ghi nhận kích thước, cân nặng thực tế và tạo các kiện hàng (Packages)',
  })
  @ApiResponse({ status: 200, description: 'Đóng gói thành công, chuyển sang PACKED' })
  async completePacking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompletePackingDto,
    @CurrentUser('id') userId?: string,
  ): Promise<CompletePackingResponseDto> {
    return this.packingService.completePacking(id, dto, userId);
  }

  @Post(':id/confirm-handover')
  @HttpCode(HttpStatus.OK)
  @LocationScoped({ resourceType: 'FULFILLMENT_ORDER', paramName: 'id' })
  @RequireAnyPermission(
    'ORDER_SHIPMENT_MANAGE',
    'ORDER_STATUS_UPDATE',
    'SHIPMENT_DISPATCH',
    'FULFILLMENT_MANAGE',
  )
  @ApiOperation({
    summary: 'Xác nhận bàn giao kiện hàng cho tài xế/bưu tá 3PL',
  })
  @ApiResponse({ status: 200, description: 'Bàn giao thành công, chuyển sang HANDED_OVER' })
  async confirmHandover(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto?: ConfirmHandoverDto,
    @CurrentUser('id') userId?: string,
  ): Promise<ConfirmHandoverResponseDto> {
    return this.handoverService.confirmHandover(id, dto, userId);
  }
}


