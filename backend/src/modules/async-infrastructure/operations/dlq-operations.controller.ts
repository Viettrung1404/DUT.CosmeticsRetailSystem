import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@core/guards/jwt-auth.guard';
import { PermissionGuard } from '@core/guards/permission.guard';
import { RequireAnyPermission } from '@core/decorators/require-permissions.decorator';
import { DlqOperationsService } from './dlq-operations.service';
import {
  QueryDlqMessagesDto,
  ReplayDlqMessagesDto,
  RetryStuckOutboxDto,
} from './dtos/dlq-operations.dto';

@ApiTags('Admin Operations & DLQ Management (EP12)')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/admin/operations')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DlqOperationsController {
  constructor(private readonly dlqOperationsService: DlqOperationsService) {}

  /**
   * Tra cứu danh sách các thông điệp lỗi hoặc chuyển vào DLQ
   */
  @Get('dlq/messages')
  @RequireAnyPermission('SYSTEM_SETTING_UPDATE', 'ADMIN')
  @ApiOperation({
    summary: 'Tra cứu danh sách thông điệp lỗi trong Dead Letter Queue',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách message lỗi có phân trang',
  })
  async listDlqMessages(@Query() query: QueryDlqMessagesDto) {
    return this.dlqOperationsService.listDlqMessages(query);
  }

  /**
   * Kích hoạt bắn lại (Replay) thông điệp lỗi từ DLQ
   */
  @Post('dlq/replay')
  @HttpCode(HttpStatus.OK)
  @RequireAnyPermission('SYSTEM_SETTING_UPDATE', 'ADMIN')
  @ApiOperation({
    summary: 'Bắn lại (Replay) các thông điệp trong DLQ an toàn và idempotent',
  })
  @ApiResponse({
    status: 200,
    description: 'Kết quả replay từng thông điệp',
  })
  async replayMessages(@Body() dto: ReplayDlqMessagesDto) {
    return this.dlqOperationsService.replayMessages(dto);
  }

  /**
   * Quét và khôi phục các Outbox Events bị kẹt về trạng thái PENDING
   */
  @Post('outbox/retry-stuck')
  @HttpCode(HttpStatus.OK)
  @RequireAnyPermission('SYSTEM_SETTING_UPDATE', 'ADMIN')
  @ApiOperation({
    summary: 'Khôi phục các Outbox Event bị kẹt (retryCount > 3 hoặc FAILED) về PENDING',
  })
  @ApiResponse({
    status: 200,
    description: 'Số lượng event đã được khôi phục',
  })
  async retryStuckOutbox(@Body() dto: RetryStuckOutboxDto) {
    return this.dlqOperationsService.retryStuckOutboxEvents(dto);
  }
}
