import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderDirection, PageDto, PageMetaDto } from '@core/common/pagination.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { GetPosSessionsUseCase } from '../../application/use-cases/get-pos-sessions.use-case';
import { PosSessionQueryDto } from '../dtos/pos-session-request.dto';
import { PosSessionResponseDto } from '../dtos/pos-session-response.dto';

@ApiTags('Admin - POS Sessions (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/pos/sessions')
export class PosSessionAdminController {
  constructor(private readonly getPosSessionsUseCase: GetPosSessionsUseCase) {}

  @Get()
  @RequirePermissions('PAYMENT_RECONCILE')
  @ApiOperation({ summary: 'Admin - Danh sách ca POS, tự lọc theo phạm vi dữ liệu (ALL / STORE)' })
  @ApiForbiddenResponse({ description: 'Thiếu quyền PAYMENT_RECONCILE' })
  async getSessions(@CurrentUser('userId') userId: string, @Query() query: PosSessionQueryDto) {
    const { items, total } = await this.getPosSessionsUseCase.execute(userId, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      order: query.order === OrderDirection.ASC ? 'asc' : 'desc',
      storeId: query.storeId,
      cashierId: query.cashierId,
      status: query.status,
      fromDate: query.fromDate,
      toDate: query.toDate,
    });

    const data = items.map((item) => PosSessionResponseDto.fromDomain(item));
    return new PageDto(data, new PageMetaDto({ pageOptionsDto: query, itemCount: total }));
  }
}
