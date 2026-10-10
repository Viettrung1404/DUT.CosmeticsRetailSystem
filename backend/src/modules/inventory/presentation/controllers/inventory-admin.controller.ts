import { Body, Controller, Get, Post, Query } from '@nestjs/common';
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
import {
  AdjustInventoryDto,
  InventoryQueryDto,
  ReceivePurchaseOrderDto,
} from '../dtos/inventory-request.dto';
import { InventoryItemResponseDto } from '../dtos/inventory-response.dto';

@ApiTags('Admin - Inventory (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/inventory')
export class InventoryAdminController {
  constructor(
    private readonly getInventoryUseCase: GetInventoryUseCase,
    private readonly receivePurchaseOrderUseCase: ReceivePurchaseOrderUseCase,
    private readonly adjustInventoryUseCase: AdjustInventoryUseCase,
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
        ? `Đã nhận đủ hàng cho đơn ${result.poNumber}`
        : `Đã nhận một phần hàng cho đơn ${result.poNumber}`;
    return { message, data: result };
  }

  @Post('adjust')
  @RequirePermissions('INVENTORY_CHECK')
  @ApiOperation({
    summary: 'Admin - Điều chỉnh tồn kho có lý do: số âm xuất theo FEFO, số dương nhập vào lô',
  })
  @ApiBadRequestResponse({ description: 'Không đủ hàng, thiếu lý do hoặc thiếu thông tin lô' })
  @ApiConflictResponse({ description: 'Đụng phần đang giữ chỗ cho đơn online' })
  async adjust(@CurrentUser('userId') userId: string, @Body() dto: AdjustInventoryDto) {
    const result = await this.adjustInventoryUseCase.execute(userId, dto);
    return { message: 'Điều chỉnh tồn kho thành công', data: result };
  }
}
