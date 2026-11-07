import { Body, Controller, Get, HttpCode, Post, Put, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OrderDirection, PageMetaDto } from '@core/common/pagination.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { JwtPayload } from '@core/guards/jwt-auth.guard';
import { FinalizeCommissionsUseCase } from '../../application/use-cases/finalize-commissions.use-case';
import { GetCommissionsUseCase } from '../../application/use-cases/get-commissions.use-case';
import { FinalizeCommissionsRequestDto, GetCommissionsQueryDto } from '../dtos/hr-request.dto';
import {
  CommissionListResponseDto,
  CommissionResponseDto,
  CommissionSummaryResponseDto,
  FinalizeCommissionsResponseDto,
} from '../dtos/hr-response.dto';

@ApiTags('Admin - HR (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/commissions')
export class CommissionAdminController {
  constructor(
    private readonly getCommissions: GetCommissionsUseCase,
    private readonly finalizeCommissions: FinalizeCommissionsUseCase,
  ) {}

  @Get()
  @RequirePermissions('EMPLOYEE_COMMISSION_VIEW')
  @ApiOperation({ summary: 'Admin - Bảng hoa hồng (lọc nhân viên, cửa hàng, tháng/năm, trạng thái) kèm tổng theo nhân viên' })
  @ApiOkResponse({ type: CommissionListResponseDto })
  async list(@CurrentUser() user: JwtPayload, @Query() query: GetCommissionsQueryDto) {
    const { items, total, summary } = await this.getCommissions.execute(user.userId, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      order: query.order ?? OrderDirection.DESC,
      employeeId: query.employeeId,
      storeId: query.storeId,
      month: query.month,
      year: query.year,
      status: query.status,
    });
    return {
      items: items.map((c) => CommissionResponseDto.fromDomain(c)),
      summary: summary.map((s) => CommissionSummaryResponseDto.fromDomain(s)),
      meta: new PageMetaDto({ pageOptionsDto: query, itemCount: total }),
    };
  }

  // Tài liệu FR-11.06 ghi PUT, yêu cầu đợt này ghi POST: nhận cả hai
  @Put('finalize')
  @Post('finalize')
  @HttpCode(200)
  @RequirePermissions('EMPLOYEE_COMMISSION_CALC')
  @ApiOperation({ summary: 'Admin - Chốt hoa hồng một tháng đã kết thúc (PENDING -> PAID); tháng đã chốt không chốt lại' })
  @ApiOkResponse({ type: FinalizeCommissionsResponseDto })
  @ApiForbiddenResponse({ description: 'Không có phạm vi toàn chuỗi' })
  @ApiConflictResponse({ description: 'Tháng đã chốt hoặc không có hoa hồng chờ chốt' })
  async finalize(@CurrentUser() user: JwtPayload, @Body() dto: FinalizeCommissionsRequestDto) {
    const result = await this.finalizeCommissions.execute(user.userId, dto.month, dto.year);
    return {
      message: `Đã chốt ${result.finalizedCount} dòng hoa hồng tháng ${dto.month}/${dto.year}`,
      data: result,
    };
  }
}
