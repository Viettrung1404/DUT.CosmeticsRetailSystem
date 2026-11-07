import { Body, Controller, Get, Param, ParseUUIDPipe, Put, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OrderDirection, PageDto, PageMetaDto } from '@core/common/pagination.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { GetAdminOrdersUseCase } from '../../application/use-cases/get-admin-orders.use-case';
import { GetAdminOrderDetailUseCase } from '../../application/use-cases/get-admin-order-detail.use-case';
import { ConfirmAdminOrderUseCase } from '../../application/use-cases/confirm-admin-order.use-case';
import { UpdateAdminOrderStatusUseCase } from '../../application/use-cases/update-admin-order-status.use-case';
import { CancelAdminOrderUseCase } from '../../application/use-cases/cancel-admin-order.use-case';
import { AdminOrderQueryDto } from '../dtos/admin-order-query.dto';
import {
  CancelOrderByAdminDto,
  ConfirmOrderDto,
  UpdateOrderStatusDto,
} from '../dtos/admin-order-action.dto';
import { AdminOrderDetailDto, AdminOrderListItemDto } from '../dtos/admin-order-response.dto';

@ApiTags('Admin - Orders (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/orders')
export class OrderAdminController {
  constructor(
    private readonly getAdminOrdersUseCase: GetAdminOrdersUseCase,
    private readonly getAdminOrderDetailUseCase: GetAdminOrderDetailUseCase,
    private readonly confirmAdminOrderUseCase: ConfirmAdminOrderUseCase,
    private readonly updateAdminOrderStatusUseCase: UpdateAdminOrderStatusUseCase,
    private readonly cancelAdminOrderUseCase: CancelAdminOrderUseCase,
  ) {}

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

  @Get(':id')
  @RequirePermissions('ORDER_ONLINE_VIEW')
  @ApiOperation({ summary: 'Admin - Chi tiết đơn: khách, sản phẩm, giá, thanh toán, vận đơn, dòng thời gian trạng thái' })
  @ApiOkResponse({ type: AdminOrderDetailDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hàng' })
  @ApiForbiddenResponse({ description: 'Thiếu quyền hoặc đơn thuộc cửa hàng khác' })
  async getOrderDetail(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const detail = await this.getAdminOrderDetailUseCase.execute(userId, id);
    return AdminOrderDetailDto.fromDomain(detail);
  }

  @Put(':id/confirm')
  @RequirePermissions('ORDER_STATUS_UPDATE')
  @ApiOperation({ summary: 'Admin - Xác nhận đơn PENDING → CONFIRMED (kiểm tra tồn kho tại cửa hàng xử lý đơn)' })
  @ApiOkResponse({ type: AdminOrderDetailDto })
  @ApiBadRequestResponse({ description: 'Đơn không ở trạng thái PENDING hoặc không đủ tồn kho' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hàng' })
  @ApiForbiddenResponse({ description: 'Thiếu quyền ORDER_STATUS_UPDATE hoặc đơn thuộc cửa hàng khác' })
  async confirmOrder(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmOrderDto,
  ) {
    const detail = await this.confirmAdminOrderUseCase.execute(userId, id, dto.note);
    return { message: 'Xác nhận đơn hàng thành công', data: AdminOrderDetailDto.fromDomain(detail) };
  }

  @Put(':id/status')
  @RequirePermissions('ORDER_STATUS_UPDATE')
  @ApiOperation({
    summary:
      'Admin - Đổi trạng thái CONFIRMED → PROCESSING → SHIPPING → DELIVERED → COMPLETED. ' +
      'SHIPPING: trừ kho (FEFO); DELIVERED: thu tiền COD; COMPLETED: tích điểm, cộng tổng chi tiêu, xét hạng, hoa hồng',
  })
  @ApiOkResponse({ type: AdminOrderDetailDto })
  @ApiBadRequestResponse({ description: 'Chuyển sai thứ tự hoặc không đủ hàng còn hạn để xuất' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hàng' })
  @ApiForbiddenResponse({ description: 'Thiếu quyền ORDER_STATUS_UPDATE hoặc đơn thuộc cửa hàng khác' })
  async updateOrderStatus(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const { detail, notes } = await this.updateAdminOrderStatusUseCase.execute(
      userId,
      id,
      dto.status,
      dto.note,
    );
    return {
      message: ['Cập nhật trạng thái đơn hàng thành công.', ...notes].join(' '),
      data: AdminOrderDetailDto.fromDomain(detail),
    };
  }

  @Put(':id/cancel')
  @RequirePermissions('ORDER_CANCEL')
  @ApiOperation({
    summary:
      'Admin - Hủy đơn ở PENDING / CONFIRMED / PROCESSING: trả hàng đang giữ, hoàn coupon, hoàn điểm, tạo phiếu hoàn tiền nếu đã thu',
  })
  @ApiOkResponse({ type: AdminOrderDetailDto })
  @ApiBadRequestResponse({ description: 'Đơn đã giao/hoàn tất/đã hủy, hoặc thiếu lý do' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hàng' })
  @ApiForbiddenResponse({ description: 'Thiếu quyền ORDER_CANCEL hoặc đơn thuộc cửa hàng khác' })
  async cancelOrder(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderByAdminDto,
  ) {
    const { detail, notes } = await this.cancelAdminOrderUseCase.execute(userId, id, dto.reason);
    return {
      message: ['Hủy đơn hàng thành công.', ...notes].join(' '),
      data: AdminOrderDetailDto.fromDomain(detail),
    };
  }
}
