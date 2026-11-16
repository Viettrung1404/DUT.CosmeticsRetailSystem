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
import { PickingService } from '../../application/services/picking.service';
import { PackingService } from '../../application/services/packing.service';
import { HandoverService } from '../../application/services/handover.service';
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
  ) {}

  @Get(':id/pick-list')
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
    return this.pickingService.startPicking(id, pickerId);
  }

  @Post(':id/complete-picking')
  @HttpCode(HttpStatus.OK)
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


