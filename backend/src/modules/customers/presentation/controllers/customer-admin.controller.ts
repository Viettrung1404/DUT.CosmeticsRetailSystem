import { Body, Controller, Get, Param, ParseUUIDPipe, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderDirection, PageDto, PageMetaDto } from '@core/common/pagination.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { GetAdminCustomersUseCase } from '../../application/use-cases/get-admin-customers.use-case';
import { ManageCustomerTagsUseCase } from '../../application/use-cases/manage-customer-tags.use-case';
import {
  AdminCustomerListItemDto,
  AdminCustomerQueryDto,
  ReplaceCustomerTagsDto,
} from '../dtos/admin-customer.dto';

@ApiTags('Admin - Customers (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/customers')
export class CustomerAdminController {
  constructor(
    private readonly getAdminCustomersUseCase: GetAdminCustomersUseCase,
    private readonly customerTags: ManageCustomerTagsUseCase,
  ) {}

  @Get('tags')
  @RequirePermissions('CUSTOMER_VIEW')
  @ApiOperation({ summary: 'Admin - Danh sách nhãn khách hàng kèm số khách, dùng cho gợi ý và phân nhóm thủ công' })
  getTags() {
    return this.customerTags.list();
  }

  @Put(':id/tags')
  @RequirePermissions('CUSTOMER_CREATE_UPDATE')
  @ApiOperation({ summary: 'Admin - Gắn nhãn cho khách (thay toàn bộ nhãn cũ), trong phạm vi dữ liệu' })
  async replaceTags(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceCustomerTagsDto,
  ) {
    const data = await this.customerTags.replace(userId, id, dto.tags);
    return { message: 'Đã cập nhật nhãn khách hàng', data };
  }

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
      tag: query.tag,
    });

    const data = items.map((item) => AdminCustomerListItemDto.fromDomain(item));
    return new PageDto(data, new PageMetaDto({ pageOptionsDto: query, itemCount: total }));
  }
}
