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
import { ListAdminReturnsUseCase } from '../../application/use-cases/list-admin-returns.use-case';
import { GetAdminReturnDetailUseCase } from '../../application/use-cases/get-admin-return-detail.use-case';
import { ApproveAdminReturnUseCase } from '../../application/use-cases/approve-admin-return.use-case';
import { RejectAdminReturnUseCase } from '../../application/use-cases/reject-admin-return.use-case';
import { ReceiveAdminReturnUseCase } from '../../application/use-cases/receive-admin-return.use-case';
import { InspectAdminReturnUseCase } from '../../application/use-cases/inspect-admin-return.use-case';
import { CompleteAdminReturnUseCase } from '../../application/use-cases/complete-admin-return.use-case';
import {
  AdminReturnQueryDto,
  InspectResultDto,
  InspectReturnDto,
  RejectReturnDto,
  ReturnDetailDto,
  ReturnListItemDto,
  ReturnNoteDto,
} from '../dtos/return-admin.dto';
import { endOfDayVn, startOfDayVn } from '../dtos/date-range.util';

const FORBIDDEN = 'Thiếu quyền ORDER_RETURN_MANAGE hoặc yêu cầu thuộc cửa hàng khác';
const NOT_FOUND = 'Không tìm thấy yêu cầu đổi trả';
const BAD_STATE = 'Yêu cầu đang ở trạng thái không cho phép thao tác này';

@ApiTags('Admin - Returns (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/returns')
export class ReturnAdminController {
  constructor(
    private readonly listReturns: ListAdminReturnsUseCase,
    private readonly getDetail: GetAdminReturnDetailUseCase,
    private readonly approveReturn: ApproveAdminReturnUseCase,
    private readonly rejectReturn: RejectAdminReturnUseCase,
    private readonly receiveReturn: ReceiveAdminReturnUseCase,
    private readonly inspectReturn: InspectAdminReturnUseCase,
    private readonly completeReturn: CompleteAdminReturnUseCase,
  ) {}

  @Get()
  @RequirePermissions('ORDER_RETURN_MANAGE')
  @ApiOperation({ summary: 'Admin - Danh sách yêu cầu đổi trả, tự lọc theo cửa hàng phụ trách' })
  @ApiOkResponse({ type: [ReturnListItemDto] })
  @ApiForbiddenResponse({ description: FORBIDDEN })
  async list(@CurrentUser('userId') userId: string, @Query() query: AdminReturnQueryDto) {
    const { items, total } = await this.listReturns.execute(userId, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      status: query.status,
      storeId: query.storeId,
      returnType: query.returnType,
      search: query.search?.trim() || undefined,
      from: startOfDayVn(query.fromDate),
      to: endOfDayVn(query.toDate),
    });
    const data = items.map((i) => ReturnListItemDto.fromDomain(i));
    return new PageDto(data, new PageMetaDto({ pageOptionsDto: query, itemCount: total }));
  }

  @Get(':id')
  @RequirePermissions('ORDER_RETURN_MANAGE')
  @ApiOperation({ summary: 'Admin - Chi tiết yêu cầu đổi trả: dòng hàng, bằng chứng, lịch sử, hoàn tiền, thao tác được làm' })
  @ApiOkResponse({ type: ReturnDetailDto })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiForbiddenResponse({ description: FORBIDDEN })
  async detail(@CurrentUser('userId') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return ReturnDetailDto.fromDomain(await this.getDetail.execute(userId, id));
  }

  @Put(':id/approve')
  @RequirePermissions('ORDER_RETURN_MANAGE')
  @ApiOperation({ summary: 'Admin - Duyệt yêu cầu: REQUESTED → APPROVED, khách mang hàng về cửa hàng' })
  @ApiOkResponse({ type: ReturnDetailDto })
  @ApiConflictResponse({ description: BAD_STATE })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiForbiddenResponse({ description: FORBIDDEN })
  async approve(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReturnNoteDto,
  ) {
    const detail = await this.approveReturn.execute(userId, id, dto.note);
    return { message: 'Đã duyệt yêu cầu đổi trả', data: ReturnDetailDto.fromDomain(detail) };
  }

  @Put(':id/reject')
  @RequirePermissions('ORDER_RETURN_MANAGE')
  @ApiOperation({ summary: 'Admin - Từ chối yêu cầu (trước khi kiểm định): → REJECTED, bắt buộc có lý do' })
  @ApiOkResponse({ type: ReturnDetailDto })
  @ApiConflictResponse({ description: BAD_STATE })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiForbiddenResponse({ description: FORBIDDEN })
  async reject(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectReturnDto,
  ) {
    const detail = await this.rejectReturn.execute(userId, id, dto.reason);
    return { message: 'Đã từ chối yêu cầu đổi trả', data: ReturnDetailDto.fromDomain(detail) };
  }

  @Put(':id/receive')
  @RequirePermissions('ORDER_RETURN_MANAGE')
  @ApiOperation({ summary: 'Admin - Xác nhận đã nhận hàng trả tại cửa hàng: APPROVED → RECEIVED' })
  @ApiOkResponse({ type: ReturnDetailDto })
  @ApiConflictResponse({ description: BAD_STATE })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiForbiddenResponse({ description: FORBIDDEN })
  async receive(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReturnNoteDto,
  ) {
    const detail = await this.receiveReturn.execute(userId, id, dto.note);
    return { message: 'Đã ghi nhận nhận hàng trả', data: ReturnDetailDto.fromDomain(detail) };
  }

  @Put(':id/inspect')
  @RequirePermissions('ORDER_RETURN_MANAGE')
  @ApiOperation({
    summary:
      'Admin - Kiểm định từng dòng: RECEIVED → INSPECTED. RESALEABLE nhập lại kho (đúng cửa hàng/lô, ghi inventory_transactions RETURN); ' +
      'DAMAGED không nhập. Loại REFUND: tạo phiếu hoàn tiền PENDING; loại EXCHANGE: lập báo giá đổi hàng cho khách',
  })
  @ApiOkResponse({ type: ReturnDetailDto })
  @ApiConflictResponse({ description: BAD_STATE + ' hoặc lô nhập lại đã hết hạn' })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiForbiddenResponse({ description: FORBIDDEN })
  async inspect(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InspectReturnDto,
  ) {
    const { detail, result } = await this.inspectReturn.execute(userId, id, dto.items, dto.note);
    const parts = [`Đã kiểm định: nhập lại kho ${result.restockedQuantity}, hàng hỏng ${result.damagedQuantity}.`];
    if (result.refundsReserved) parts.push('Đã tạo phiếu hoàn tiền chờ xử lý.');
    if (result.quotePrepared) parts.push('Đã lập báo giá đổi hàng, chờ khách chấp nhận.');
    return {
      message: parts.join(' '),
      data: { ...ReturnDetailDto.fromDomain(detail), inspection: Object.assign(new InspectResultDto(), result) },
    };
  }

  @Put(':id/complete')
  @RequirePermissions('ORDER_RETURN_MANAGE')
  @ApiOperation({
    summary:
      'Admin - Hoàn tất: INSPECTED → COMPLETED, đối soát điểm và tổng chi tiêu của khách. ' +
      'Chỉ chạy được khi mọi phiếu hoàn tiền của yêu cầu đã hoàn (loại EXCHANGE: khách đã chấp nhận báo giá)',
  })
  @ApiOkResponse({ type: ReturnDetailDto })
  @ApiConflictResponse({ description: BAD_STATE + ' hoặc còn phiếu hoàn tiền chưa hoàn' })
  @ApiNotFoundResponse({ description: NOT_FOUND })
  @ApiForbiddenResponse({ description: FORBIDDEN })
  async complete(@CurrentUser('userId') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    const detail = await this.completeReturn.execute(userId, id);
    return { message: 'Đã hoàn tất yêu cầu đổi trả', data: ReturnDetailDto.fromDomain(detail) };
  }
}
