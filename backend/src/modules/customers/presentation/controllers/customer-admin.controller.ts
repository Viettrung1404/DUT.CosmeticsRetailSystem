import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderDirection, PageDto, PageMetaDto } from '@core/common/pagination.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { GetAdminCustomersUseCase } from '../../application/use-cases/get-admin-customers.use-case';
import { AdminCustomerListItemDto, AdminCustomerQueryDto } from '../dtos/admin-customer.dto';

@ApiTags('Admin - Customers (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/customers')
export class CustomerAdminController {
  constructor(private readonly getAdminCustomersUseCase: GetAdminCustomersUseCase) {}

  @Get()
  @RequirePermissions('CUSTOMER_VIEW')
  @ApiOperation({
    summary:
      'Admin - Danh sách khách hàng: tìm theo tên/SĐT/email, lọc hạng và cửa hàng, tự lọc theo phạm vi dữ liệu',
  })
  @ApiForbiddenResponse({ description: 'Thiếu quyền CUSTOMER_VIEW' })
  async getCustomers(@CurrentUser('userId') userId: string, @Query() query: AdminCustomerQueryDto) {
    const { items, total } = await this.getAdminCustomersUseCase.execute(userId, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      sortBy: query.sortBy ?? 'createdAt',
      order: query.order === OrderDirection.ASC ? 'asc' : 'desc',
      search: query.search,
      loyaltyTierId: query.loyaltyTierId,
      storeId: query.storeId,
    });

    const data = items.map((item) => AdminCustomerListItemDto.fromDomain(item));
    return new PageDto(data, new PageMetaDto({ pageOptionsDto: query, itemCount: total }));
  }
}
