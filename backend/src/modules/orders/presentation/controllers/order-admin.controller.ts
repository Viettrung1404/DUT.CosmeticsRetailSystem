import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderDirection, PageDto, PageMetaDto } from '@core/common/pagination.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { GetAdminOrdersUseCase } from '../../application/use-cases/get-admin-orders.use-case';
import { AdminOrderQueryDto } from '../dtos/admin-order-query.dto';
import { AdminOrderListItemDto } from '../dtos/admin-order-response.dto';

@ApiTags('Admin - Orders (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/orders')
export class OrderAdminController {
  constructor(private readonly getAdminOrdersUseCase: GetAdminOrdersUseCase) {}

  @Get()
  @RequirePermissions('ORDER_ONLINE_VIEW')
  @ApiOperation({
    summary: 'Admin - Danh sách đơn hàng, tự lọc theo phạm vi dữ liệu (ALL / STORE / SELF)',
  })
  @ApiForbiddenResponse({ description: 'Thiếu quyền ORDER_ONLINE_VIEW' })
  async getOrders(@CurrentUser('userId') userId: string, @Query() query: AdminOrderQueryDto) {
    const { items, total } = await this.getAdminOrdersUseCase.execute(userId, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      sortBy: query.sortBy ?? 'createdAt',
      order: query.order === OrderDirection.ASC ? 'asc' : 'desc',
      search: query.search,
      status: query.status,
      orderType: query.orderType,
      storeId: query.storeId,
      customerId: query.customerId,
      fromDate: query.fromDate,
      toDate: query.toDate,
    });

    const data = items.map((item) => AdminOrderListItemDto.fromDomain(item));
    return new PageDto(data, new PageMetaDto({ pageOptionsDto: query, itemCount: total }));
  }
}
