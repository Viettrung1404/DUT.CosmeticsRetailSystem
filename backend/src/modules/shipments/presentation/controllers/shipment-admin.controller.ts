import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PageDto, PageMetaDto } from '@core/common/pagination.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { CancelAdminShipmentUseCase } from '../../application/use-cases/cancel-admin-shipment.use-case';
import { CreateAdminShipmentUseCase } from '../../application/use-cases/create-admin-shipment.use-case';
import { GetAdminShipmentDetailUseCase } from '../../application/use-cases/get-admin-shipment-detail.use-case';
import { ListAdminShipmentsUseCase } from '../../application/use-cases/list-admin-shipments.use-case';
import { ReceiveReturnedShipmentUseCase } from '../../application/use-cases/receive-returned-shipment.use-case';
import { SimulateAdminShipmentUseCase } from '../../application/use-cases/simulate-admin-shipment.use-case';
import {
  AdminShipmentQueryDto,
  CreateShipmentDto,
  ReceiveReturnedShipmentDto,
  ReceiveReturnedShipmentResultDto,
  ShipmentDetailDto,
  ShipmentListItemDto,
  SimulateShipmentDto,
  endOfDayVn,
  startOfDayVn,
} from '../dtos/shipment-admin.dto';

const FORBIDDEN = 'Thiếu quyền ORDER_SHIPMENT_MANAGE hoặc đơn/vận đơn thuộc cửa hàng khác';
const NOT_FOUND = 'Không tìm thấy vận đơn';

@ApiTags('Admin - Shipments (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
export class ShipmentAdminController {
  constructor(
    private readonly createShipment: CreateAdminShipmentUseCase,
    private readonly listShipments: ListAdminShipmentsUseCase,
    private readonly getDetail: GetAdminShipmentDetailUseCase,
    private readonly cancelShipment: CancelAdminShipmentUseCase,
    private readonly simulate: SimulateAdminShipmentUseCase,
    private readonly receiveReturned: ReceiveReturnedShipmentUseCase,
  ) {}

  @Post('shipments/:id/receive-return')
  @RequirePermissions('ORDER_SHIPMENT_MANAGE', 'ORDER_RETURN_MANAGE')
  @ApiOperation({
    summary:
      'Admin - Nhận hàng hoàn khi giao thất bại (vận đơn RETURNED): nhập lại đúng lô đã xuất, bỏ phần hỏng; ' +
      'đơn đã trả trước thì tạo phiếu hoàn chờ Kế toán. Mỗi vận đơn nhận một lần',
  })
  @ApiOkResponse({ type: ReceiveReturnedShipmentResultDto })
  @ApiConflictResponse({ description: 'Vận đơn chưa hoàn về, hoặc đã nhận hàng hoàn trước đó' })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiForbiddenResponse({ description: 'Thiếu quyền ORDER_SHIPMENT_MANAGE + ORDER_RETURN_MANAGE hoặc vận đơn thuộc cửa hàng khác' })
  async receiveReturn(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceiveReturnedShipmentDto,
  ) {
    const result = await this.receiveReturned.execute(userId, id, dto);
    return { message: 'Đã nhận hàng hoàn về cửa hàng', data: result };
  }

  @Post('orders/:id/shipments')
  @RequirePermissions('ORDER_SHIPMENT_MANAGE')
  @ApiOperation({
    summary:
      'Admin - Tạo vận đơn giao hàng cho đơn online đang PROCESSING. Tiền thu hộ (COD) = phần chưa thanh toán, phí ship lấy từ đơn',
  })
  @ApiCreatedResponse({ type: ShipmentDetailDto })
  @ApiConflictResponse({ description: 'Đơn không ở trạng thái PROCESSING hoặc đã có vận đơn còn hiệu lực' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hàng' })
  @ApiForbiddenResponse({ description: FORBIDDEN })
  async create(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: CreateShipmentDto,
  ) {
    const detail = await this.createShipment.execute(userId, orderId, dto.carrierCode);
    return { message: 'Đã tạo vận đơn', data: ShipmentDetailDto.fromDomain(detail) };
  }

  @Get('shipments')
  @RequirePermissions('ORDER_SHIPMENT_MANAGE')
  @ApiOperation({ summary: 'Admin - Danh sách vận đơn, lọc theo trạng thái, hãng, cửa hàng, ngày; tìm theo mã' })
  @ApiOkResponse({ type: [ShipmentListItemDto] })
  @ApiForbiddenResponse({ description: FORBIDDEN })
  async list(@CurrentUser('userId') userId: string, @Query() query: AdminShipmentQueryDto) {
    const { items, total } = await this.listShipments.execute(userId, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      status: query.status,
      carrierCode: query.carrierCode,
      storeId: query.storeId,
      orderId: query.orderId,
      search: query.search?.trim() || undefined,
      from: startOfDayVn(query.fromDate),
      to: endOfDayVn(query.toDate),
    });
    const data = items.map((i) => ShipmentListItemDto.fromDomain(i));
    return new PageDto(data, new PageMetaDto({ pageOptionsDto: query, itemCount: total }));
  }

  @Get('shipments/:id')
  @RequirePermissions('ORDER_SHIPMENT_MANAGE')
  @ApiOperation({ summary: 'Admin - Chi tiết vận đơn kèm hành trình vận chuyển' })
  @ApiOkResponse({ type: ShipmentDetailDto })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiForbiddenResponse({ description: FORBIDDEN })
  async detail(@CurrentUser('userId') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return ShipmentDetailDto.fromDomain(await this.getDetail.execute(userId, id));
  }

  @Post('shipments/:id/cancel')
  @RequirePermissions('ORDER_SHIPMENT_MANAGE')
  @ApiOperation({ summary: 'Admin - Hủy vận đơn khi hãng chưa lấy hàng (đơn vẫn PROCESSING, có thể tạo vận đơn khác)' })
  @ApiOkResponse({ type: ShipmentDetailDto })
  @ApiConflictResponse({ description: 'Hãng đã lấy hàng, không hủy được' })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiForbiddenResponse({ description: FORBIDDEN })
  async cancel(@CurrentUser('userId') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    const detail = await this.cancelShipment.execute(userId, id);
    return { message: 'Đã hủy vận đơn', data: ShipmentDetailDto.fromDomain(detail) };
  }

  @Post('shipments/:id/simulate')
  @RequirePermissions('ORDER_SHIPMENT_MANAGE')
  @ApiOperation({
    summary:
      'Admin - Giả lập hãng vận chuyển báo trạng thái kế tiếp (chỉ khi SHIPPING_MOCK_ENABLED=true). Sự kiện có chữ ký đi qua đúng đường xử lý của webhook',
  })
  @ApiOkResponse({ type: ShipmentDetailDto })
  @ApiNotFoundResponse({ description: 'Giả lập đang tắt hoặc không tìm thấy vận đơn' })
  @ApiConflictResponse({ description: 'Trạng thái mới không hợp lệ với trạng thái hiện tại' })
  @ApiForbiddenResponse({ description: FORBIDDEN })
  async simulateEvent(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SimulateShipmentDto,
  ) {
    const detail = await this.simulate.execute(userId, id, dto.status);
    return { message: 'Đã giả lập sự kiện vận chuyển', data: ShipmentDetailDto.fromDomain(detail) };
  }
}
