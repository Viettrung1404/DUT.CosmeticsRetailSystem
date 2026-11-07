import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiConflictResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PageDto, PageMetaDto } from '@core/common/pagination.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import {
  RequireAnyPermission,
  RequirePermissions,
} from '@core/decorators/require-permissions.decorator';
import { FinanceUseCase } from '../../application/use-cases/finance.use-case';
import {
  MarkReconciledDto,
  PaymentHistoryQueryDto,
  ReconciliationQueryDto,
} from '../dtos/finance-request.dto';

@ApiTags('Admin - Finance (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
export class FinanceAdminController {
  constructor(private readonly finance: FinanceUseCase) {}

  @Get('payments')
  @RequireAnyPermission('PAYMENT_COLLECT', 'PAYMENT_RECONCILE', 'PAYMENT_REFUND')
  @ApiOperation({
    summary: 'Admin - Lịch sử giao dịch thanh toán; NV bán hàng chỉ thấy giao dịch trong ca của mình',
  })
  async payments(@CurrentUser('userId') userId: string, @Query() query: PaymentHistoryQueryDto) {
    const { items, total } = await this.finance.payments(userId, {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      storeId: query.storeId,
      from: query.from,
      to: query.to,
      paymentMethod: query.paymentMethod,
      status: query.status,
    });
    return new PageDto(items, new PageMetaDto({ pageOptionsDto: query, itemCount: total }));
  }

  @Get('reconciliation')
  @RequirePermissions('PAYMENT_RECONCILE')
  @ApiOperation({ summary: 'Kế toán - Bảng đối soát một ngày, gom theo cửa hàng + kênh + phương thức' })
  reconciliation(@CurrentUser('userId') userId: string, @Query() query: ReconciliationQueryDto) {
    return this.finance.reconciliation(userId, query);
  }

  @Put('reconciliation/mark')
  @RequirePermissions('PAYMENT_RECONCILE')
  @ApiConflictResponse({ description: 'Nhóm POS còn ca chưa chốt đối soát' })
  @ApiOperation({ summary: 'Kế toán - Đánh dấu đã đối soát cả nhóm giao dịch (ghi payments.reconciled_at)' })
  async mark(@CurrentUser('userId') userId: string, @Body() dto: MarkReconciledDto) {
    const data = await this.finance.mark(userId, dto);
    return { message: `Đã đánh dấu đối soát ${data.marked} giao dịch`, data };
  }
}
