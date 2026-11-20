import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequireAnyPermission } from '@core/decorators/require-permissions.decorator';
import { CodReconciliationService } from '../../application/services/cod-reconciliation.service';
import {
  ReconcileBatchDto,
  CodReconciliationResponseDto,
  CodReconciliationQueryDto,
} from '../dtos/cod-reconciliation.dto';

@ApiTags('Admin COD & Reconciliation (Kế Toán - Đối Soát)')
@ApiBearerAuth('JWT-auth')
@Controller('admin/cod')
export class AdminCodController {
  constructor(
    private readonly reconciliationService: CodReconciliationService,
  ) {}

  @Post('reconcile-batch')
  @HttpCode(HttpStatus.CREATED)
  @RequireAnyPermission('PAYMENT_RECONCILE', 'FINANCE_ADMIN', 'ADMIN')
  @ApiOperation({
    summary: 'Nhập bảng kê đối soát định kỳ của GHN / Ahamove & tự động khớp số dư / cảnh báo sai lệch',
  })
  @ApiCreatedResponse({
    description: 'Đối soát bảng kê thành công (APPROVED nếu khớp 100%, DISCREPANCY_FLAGGED nếu có sai lệch)',
    type: CodReconciliationResponseDto,
  })
  @ApiConflictResponse({ description: 'Mã kỳ/phiên đối soát đã được xử lý trước đó' })
  async reconcileBatch(
    @CurrentUser('userId') userId: string,
    @Body() dto: ReconcileBatchDto,
  ): Promise<CodReconciliationResponseDto> {
    return this.reconciliationService.reconcileBatch(dto, userId);
  }

  @Get('reconciliations')
  @RequireAnyPermission('PAYMENT_RECONCILE', 'FINANCE_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Danh sách các bảng kê đối soát theo kỳ' })
  @ApiOkResponse({ description: 'Danh sách bảng kê đối soát' })
  async listReconciliations(@Query() query: CodReconciliationQueryDto) {
    return this.reconciliationService.listReconciliations(query);
  }

  @Get('reconciliations/:id')
  @RequireAnyPermission('PAYMENT_RECONCILE', 'FINANCE_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Xem chi tiết bảng kê đối soát kèm danh sách từng bưu kiện' })
  @ApiOkResponse({ type: CodReconciliationResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy bảng kê đối soát' })
  async getReconciliation(
    @Param('id') id: string,
  ): Promise<CodReconciliationResponseDto> {
    return this.reconciliationService.getReconciliation(id);
  }
}
