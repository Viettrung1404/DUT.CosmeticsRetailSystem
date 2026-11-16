import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequireAnyPermission } from '@core/decorators/require-permissions.decorator';
import { FulfillmentQueueService } from '../../application/services/fulfillment-queue.service';
import {
  TaskQueueQueryDto,
  TaskQueueResponseDto,
} from '../dtos/queue.dto';

@ApiTags('Admin - Fulfillment Work Queues')
@ApiBearerAuth('JWT-auth')
@Controller('admin/fulfillment/tasks')
export class AdminFulfillmentQueueController {
  constructor(
    private readonly queueService: FulfillmentQueueService,
  ) {}

  @Get('picking')
  @RequireAnyPermission(
    'ORDER_ONLINE_VIEW',
    'ORDER_SHIPMENT_MANAGE',
    'INVENTORY_VIEW',
    'FULFILLMENT_PICK',
    'FULFILLMENT_MANAGE',
  )
  @ApiOperation({
    summary: 'Hàng đợi nhặt hàng (Picking Queue): Lấy danh sách đơn cần nhặt theo chi nhánh',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách hàng đợi nhặt hàng thành công',
    type: TaskQueueResponseDto,
  })
  async getPickingTasks(
    @CurrentUser() user: any,
    @Query() query: TaskQueueQueryDto,
  ): Promise<TaskQueueResponseDto> {
    return this.queueService.getPickingTasks(user, query);
  }

  @Get('packing')
  @RequireAnyPermission(
    'ORDER_ONLINE_VIEW',
    'ORDER_SHIPMENT_MANAGE',
    'INVENTORY_VIEW',
    'FULFILLMENT_PACK',
    'FULFILLMENT_MANAGE',
  )
  @ApiOperation({
    summary: 'Hàng đợi đóng gói (Packing Queue): Lấy danh sách đơn đã nhặt xong chờ đóng gói',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách hàng đợi đóng gói thành công',
    type: TaskQueueResponseDto,
  })
  async getPackingTasks(
    @CurrentUser() user: any,
    @Query() query: TaskQueueQueryDto,
  ): Promise<TaskQueueResponseDto> {
    return this.queueService.getPackingTasks(user, query);
  }

  @Get('handover')
  @RequireAnyPermission(
    'ORDER_ONLINE_VIEW',
    'ORDER_SHIPMENT_MANAGE',
    'INVENTORY_VIEW',
    'SHIPMENT_DISPATCH',
    'FULFILLMENT_MANAGE',
  )
  @ApiOperation({
    summary: 'Hàng đợi bàn giao (Handover Queue): Lấy danh sách kiện hàng chờ bàn giao shipper',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách hàng đợi bàn giao thành công',
    type: TaskQueueResponseDto,
  })
  async getHandoverTasks(
    @CurrentUser() user: any,
    @Query() query: TaskQueueQueryDto,
  ): Promise<TaskQueueResponseDto> {
    return this.queueService.getHandoverTasks(user, query);
  }
}
