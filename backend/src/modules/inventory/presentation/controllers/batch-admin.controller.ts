import { Body, Controller, Get, Param, ParseUUIDPipe, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PageDto, PageMetaDto } from '@core/common/pagination.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { ManageBatchesUseCase } from '../../application/use-cases/manage-batches.use-case';
import { BatchQueryDto, LockBatchDto } from '../dtos/inventory-workflow-request.dto';

@ApiTags('Admin - Inventory (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/batches')
export class BatchAdminController {
  constructor(private readonly batches: ManageBatchesUseCase) {}

  @Get()
  @RequirePermissions('INVENTORY_BATCH_MANAGE')
  @ApiOperation({ summary: 'Admin - Danh sách lô theo hạn dùng (lọc sắp hết hạn 30/60/90 ngày, đã hết hạn, đang khóa)' })
  async list(@CurrentUser('userId') userId: string, @Query() query: BatchQueryDto) {
    const { items, total } = await this.batches.list(userId, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      storeId: query.storeId,
      productVariantId: query.productVariantId,
      search: query.search,
      expiringWithinDays: query.expiringWithinDays,
      expired: query.expired,
      isActive: query.isActive,
      includeEmpty: query.includeEmpty,
    });
    return new PageDto(items, new PageMetaDto({ pageOptionsDto: query, itemCount: total }));
  }

  @Put(':id/lock')
  @RequirePermissions('INVENTORY_BATCH_MANAGE')
  @ApiOperation({ summary: 'Admin - Khóa lô (lỗi chất lượng): mọi luồng xuất FEFO bỏ qua lô này' })
  async lock(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LockBatchDto,
  ) {
    const data = await this.batches.setActive(userId, id, false, dto.reason);
    return { message: `Đã khóa lô ${data.batchNumber}`, data };
  }

  @Put(':id/unlock')
  @RequirePermissions('INVENTORY_BATCH_MANAGE')
  @ApiOperation({ summary: 'Admin - Mở khóa lô' })
  async unlock(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LockBatchDto,
  ) {
    const data = await this.batches.setActive(userId, id, true, dto.reason);
    return { message: `Đã mở khóa lô ${data.batchNumber}`, data };
  }
}
