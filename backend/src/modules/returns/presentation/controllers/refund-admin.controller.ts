import { Body, Controller, Get, Param, ParseUUIDPipe, Put, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PageDto, PageMetaDto } from '@core/common/pagination.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { ListAdminRefundsUseCase } from '../../application/use-cases/list-admin-refunds.use-case';
import { GetAdminRefundDetailUseCase } from '../../application/use-cases/get-admin-refund-detail.use-case';
import { ProcessAdminRefundUseCase } from '../../application/use-cases/process-admin-refund.use-case';
import { RejectAdminRefundUseCase } from '../../application/use-cases/reject-admin-refund.use-case';
import {
  AdminRefundQueryDto,
  ProcessRefundDto,
  RefundDetailDto,
  RefundListItemDto,
  RejectRefundDto,
} from '../dtos/refund-admin.dto';
import { endOfDayVn, startOfDayVn } from '../dtos/date-range.util';

const FORBIDDEN = 'Thiếu quyền PAYMENT_REFUND, phiếu thuộc cửa hàng khác, hoặc phương thức hoàn vượt thẩm quyền';
const NOT_FOUND = 'Không tìm thấy phiếu hoàn tiền';

@ApiTags('Admin - Refunds (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/refunds')
export class RefundAdminController {
  constructor(
    private readonly listRefunds: ListAdminRefundsUseCase,
    private readonly getDetail: GetAdminRefundDetailUseCase,
    private readonly processRefund: ProcessAdminRefundUseCase,
    private readonly rejectRefund: RejectAdminRefundUseCase,
  ) {}

  @Get()
  @RequirePermissions('PAYMENT_REFUND')
  @ApiOperation({ summary: 'Admin - Danh sách phiếu hoàn tiền, kèm cách hoàn người đăng nhập được chọn' })
  @ApiOkResponse({ type: [RefundListItemDto] })
  @ApiForbiddenResponse({ description: FORBIDDEN })
  async list(@CurrentUser('userId') userId: string, @Query() query: AdminRefundQueryDto) {
    const { items, total } = await this.listRefunds.execute(userId, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      status: query.status,
      storeId: query.storeId,
      orderId: query.orderId,
      returnOrderId: query.returnOrderId,
      search: query.search?.trim() || undefined,
      from: startOfDayVn(query.fromDate),
      to: endOfDayVn(query.toDate),
    });
    const data = items.map((i) => RefundListItemDto.fromDomain(i));
    return new PageDto(data, new PageMetaDto({ pageOptionsDto: query, itemCount: total }));
  }

  @Get(':id')
  @RequirePermissions('PAYMENT_REFUND')
  @ApiOperation({ summary: 'Admin - Chi tiết phiếu hoàn tiền: khoản thanh toán gốc, yêu cầu đổi trả, lịch sử xử lý' })
  @ApiOkResponse({ type: RefundDetailDto })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiForbiddenResponse({ description: FORBIDDEN })
  async detail(@CurrentUser('userId') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return RefundDetailDto.fromDomain(await this.getDetail.execute(userId, id));
  }

  @Put(':id/process')
  @RequirePermissions('PAYMENT_REFUND')
  @ApiOperation({
    summary:
      'Admin - Đánh dấu đã hoàn tiền (ghi nhận thủ công). Tiền vào kênh nào hoàn về kênh đó: CASH chỉ cho khoản gốc tiền mặt/COD, ' +
      'khách tại quầy, người hoàn đang mở ca POS ở cửa hàng của đơn (khoản hoàn trừ vào tiền mặt của ca). ' +
      'BANK_TRANSFER do Kế toán/Admin, kèm mã tham chiếu',
  })
  @ApiOkResponse({ type: RefundDetailDto })
  @ApiConflictResponse({ description: 'Phiếu đã hoàn, hoặc số tiền vượt giá trị đã thanh toán / hàng trả' })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiForbiddenResponse({ description: FORBIDDEN })
  async process(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProcessRefundDto,
  ) {
    const detail = await this.processRefund.execute(userId, id, dto);
    return { message: 'Đã ghi nhận hoàn tiền cho khách', data: RefundDetailDto.fromDomain(detail) };
  }

  @Put(':id/reject')
  @RequirePermissions('PAYMENT_REFUND')
  @ApiOperation({ summary: 'Admin - Từ chối/hủy phiếu hoàn tiền đang chờ (→ FAILED, bắt buộc có lý do). Vẫn xử lý lại được sau đó' })
  @ApiOkResponse({ type: RefundDetailDto })
  @ApiConflictResponse({ description: 'Phiếu không còn ở trạng thái chờ xử lý' })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiForbiddenResponse({ description: FORBIDDEN })
  async reject(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectRefundDto,
  ) {
    const detail = await this.rejectRefund.execute(userId, id, dto.reason);
    return { message: 'Đã từ chối phiếu hoàn tiền', data: RefundDetailDto.fromDomain(detail) };
  }
}
