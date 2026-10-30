import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PageDto, PageMetaDto } from '@core/common/pagination.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { GetInventoryUseCase } from '../../application/use-cases/get-inventory.use-case';
import { ReceivePurchaseOrderUseCase } from '../../application/use-cases/receive-purchase-order.use-case';
import { AdjustInventoryUseCase } from '../../application/use-cases/adjust-inventory.use-case';
import { GetAdjustmentsUseCase } from '../../application/use-cases/get-adjustments.use-case';
import { ReviewAdjustmentUseCase } from '../../application/use-cases/review-adjustment.use-case';
import { CancelAdjustmentUseCase } from '../../application/use-cases/cancel-adjustment.use-case';
import { UpdateInventoryThresholdsUseCase } from '../../application/use-cases/update-inventory-thresholds.use-case';
import {
  AdjustInventoryDto,
  InventoryQueryDto,
  ReceivePurchaseOrderDto,
} from '../dtos/inventory-request.dto';
import {
  AdjustmentQueryDto,
  ReviewNoteDto,
  UpdateThresholdsDto,
} from '../dtos/inventory-workflow-request.dto';
import { InventoryItemResponseDto } from '../dtos/inventory-response.dto';

@ApiTags('Admin - Inventory (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/inventory')
export class InventoryAdminController {
  constructor(
    private readonly getInventoryUseCase: GetInventoryUseCase,
    private readonly receivePurchaseOrderUseCase: ReceivePurchaseOrderUseCase,
    private readonly adjustInventoryUseCase: AdjustInventoryUseCase,
    private readonly getAdjustments: GetAdjustmentsUseCase,
    private readonly reviewAdjustment: ReviewAdjustmentUseCase,
    private readonly cancelAdjustmentUseCase: CancelAdjustmentUseCase,
    private readonly updateThresholdsUseCase: UpdateInventoryThresholdsUseCase,
  ) {}

  @Get()
  @RequirePermissions('INVENTORY_VIEW')
  @ApiOperation({
    summary: 'Admin - Xem tồn kho (thực tế / giữ chỗ / khả dụng), tự lọc theo phạm vi dữ liệu',
  })
  @ApiForbiddenResponse({ description: 'Cửa hàng ngoài phạm vi của bạn' })
  async getInventory(@CurrentUser('userId') userId: string, @Query() query: InventoryQueryDto) {
    const { items, total } = await this.getInventoryUseCase.execute(userId, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      storeId: query.storeId,
      categoryId: query.categoryId,
      brandId: query.brandId,
      search: query.search,
      status: query.status,
    });
    const data = items.map((item) => InventoryItemResponseDto.fromDomain(item));
    return new PageDto(data, new PageMetaDto({ pageOptionsDto: query, itemCount: total }));
  }

  @Post('receive')
  @RequirePermissions('PO_RECEIVE')
  @ApiOperation({
    summary: 'Admin - Nhận hàng theo đơn đặt hàng NCC: ghi lô + hạn dùng, cộng tồn, cập nhật giá vốn',
  })
  @ApiBadRequestResponse({ description: 'Đơn chưa duyệt / đã nhận đủ, nhận vượt số đặt, lô hết hạn' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn đặt hàng' })
  @ApiConflictResponse({ description: 'Số lô trùng nhưng khác hạn dùng, hoặc đơn vừa được người khác nhận' })
  async receive(@CurrentUser('userId') userId: string, @Body() dto: ReceivePurchaseOrderDto) {
    const result = await this.receivePurchaseOrderUseCase.execute(userId, dto);
    const message =
      result.status === 'RECEIVED'
        ? `Đã nhận đủ hàng cho đơn ${result.poNumber} (phiếu nhập ${result.receiptCode})`
        : `Đã nhận một phần hàng cho đơn ${result.poNumber} (phiếu nhập ${result.receiptCode})`;
    return { message, data: result };
  }

  @Post('adjust')
  @RequirePermissions('INVENTORY_CHECK')
  @ApiOperation({
    summary:
      'Admin - Lập phiếu điều chỉnh: số dương nhập vào lô ngay; số âm (xuất hủy) tạo phiếu chờ người khác duyệt',
  })
  @ApiBadRequestResponse({ description: 'Không đủ hàng, thiếu lý do hoặc thiếu thông tin lô' })
  @ApiConflictResponse({ description: 'Đụng phần đang giữ chỗ cho đơn online' })
  async adjust(@CurrentUser('userId') userId: string, @Body() dto: AdjustInventoryDto) {
    const result = await this.adjustInventoryUseCase.execute(userId, dto);
    const message =
      result.status === 'PENDING'
        ? `Đã lập phiếu ${result.adjustmentCode}, chờ người khác duyệt mới trừ tồn`
        : 'Điều chỉnh tồn kho thành công';
    return { message, data: result };
  }

  @Get('adjustments')
  @RequirePermissions('INVENTORY_CHECK')
  @ApiOperation({ summary: 'Admin - Danh sách phiếu điều chỉnh / xuất hủy theo phạm vi dữ liệu' })
  async listAdjustments(@CurrentUser('userId') userId: string, @Query() query: AdjustmentQueryDto) {
    const { items, total } = await this.getAdjustments.execute(userId, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      storeId: query.storeId,
      status: query.status,
    });
    return new PageDto(items, new PageMetaDto({ pageOptionsDto: query, itemCount: total }));
  }

  @Get('adjustments/:id')
  @RequirePermissions('INVENTORY_CHECK')
  @ApiOperation({ summary: 'Admin - Chi tiết phiếu điều chỉnh' })
  adjustmentDetail(@CurrentUser('userId') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.getAdjustments.detail(userId, id);
  }

  @Put('adjustments/:id/approve')
  @RequirePermissions('INVENTORY_CHECK')
  @ApiOperation({ summary: 'Admin - Duyệt phiếu xuất hủy (người duyệt khác người lập), trừ tồn theo FEFO' })
  async approveAdjustment(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewNoteDto,
  ) {
    const data = await this.reviewAdjustment.execute(userId, id, 'APPROVE', dto.note);
    return { message: `Đã duyệt phiếu ${data.adjustmentCode}`, data };
  }

  @Put('adjustments/:id/reject')
  @RequirePermissions('INVENTORY_CHECK')
  @ApiOperation({ summary: 'Admin - Từ chối phiếu xuất hủy' })
  async rejectAdjustment(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewNoteDto,
  ) {
    const data = await this.reviewAdjustment.execute(userId, id, 'REJECT', dto.note);
    return { message: `Đã từ chối phiếu ${data.adjustmentCode}`, data };
  }

  @Put('adjustments/:id/cancel')
  @RequirePermissions('INVENTORY_CHECK')
  @ApiOperation({ summary: 'Admin - Người lập hủy phiếu đang chờ duyệt' })
  async cancelAdjustment(@CurrentUser('userId') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    const data = await this.cancelAdjustmentUseCase.execute(userId, id);
    return { message: `Đã hủy phiếu ${data.adjustmentCode}`, data };
  }

  @Put(':id/thresholds')
  @RequirePermissions('INVENTORY_WARN_LOW')
  @ApiOperation({ summary: 'Admin - Cài mức tồn tối thiểu / tối đa để cảnh báo (id = dòng tồn kho)' })
  async updateThresholds(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateThresholdsDto,
  ) {
    const data = await this.updateThresholdsUseCase.execute(userId, id, dto);
    return { message: 'Đã cập nhật ngưỡng cảnh báo tồn kho', data };
  }
}
