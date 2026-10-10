import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { OpenPosSessionUseCase } from '../../application/use-cases/open-pos-session.use-case';
import { ClosePosSessionUseCase } from '../../application/use-cases/close-pos-session.use-case';
import { ReconcilePosSessionUseCase } from '../../application/use-cases/reconcile-pos-session.use-case';
import { GetCurrentPosSessionUseCase } from '../../application/use-cases/get-current-pos-session.use-case';
import {
  ClosePosSessionDto,
  CurrentPosSessionQueryDto,
  OpenPosSessionDto,
  ReconcilePosSessionDto,
} from '../dtos/pos-session-request.dto';
import { PosSessionResponseDto } from '../dtos/pos-session-response.dto';

@ApiTags('POS - Sessions (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('pos/sessions')
export class PosSessionController {
  constructor(
    private readonly openPosSessionUseCase: OpenPosSessionUseCase,
    private readonly closePosSessionUseCase: ClosePosSessionUseCase,
    private readonly reconcilePosSessionUseCase: ReconcilePosSessionUseCase,
    private readonly getCurrentPosSessionUseCase: GetCurrentPosSessionUseCase,
  ) {}

  @Get('current')
  @RequirePermissions('PAYMENT_COLLECT')
  @ApiOperation({ summary: 'POS - Ca đang mở của cửa hàng (data = null nếu chưa có ca)' })
  @ApiForbiddenResponse({ description: 'Cửa hàng ngoài phạm vi của bạn' })
  async getCurrent(
    @CurrentUser('userId') userId: string,
    @Query() query: CurrentPosSessionQueryDto,
  ) {
    const session = await this.getCurrentPosSessionUseCase.execute(userId, query.storeId);
    return session ? PosSessionResponseDto.fromDomain(session) : null;
  }

  @Post('open')
  @RequirePermissions('PAYMENT_COLLECT')
  @ApiOperation({ summary: 'POS - Mở ca, khai báo tiền mặt đầu ca (mỗi cửa hàng chỉ một ca mở)' })
  @ApiBadRequestResponse({ description: 'Cửa hàng ngừng hoạt động hoặc là kho tổng' })
  @ApiConflictResponse({ description: 'Cửa hàng hoặc bạn đang có ca chưa đóng' })
  async open(@CurrentUser('userId') userId: string, @Body() dto: OpenPosSessionDto) {
    const session = await this.openPosSessionUseCase.execute(userId, dto);
    return { message: 'Mở ca thành công', data: PosSessionResponseDto.fromDomain(session) };
  }

  @Post(':id/close')
  @HttpCode(200)
  @RequirePermissions('PAYMENT_COLLECT')
  @ApiOperation({ summary: 'POS - Đóng ca: nhập tiền mặt đếm được, hệ thống tính chênh lệch' })
  @ApiOkResponse({ type: PosSessionResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy ca' })
  @ApiConflictResponse({ description: 'Ca đã đóng' })
  async close(
    @CurrentUser('userId') userId: string,
    @CurrentUser('permissionCodes') permissionCodes: string[],
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ClosePosSessionDto,
  ) {
    const session = await this.closePosSessionUseCase.execute(userId, permissionCodes ?? [], id, dto);
    return { message: 'Đóng ca thành công', data: PosSessionResponseDto.fromDomain(session) };
  }

  @Post(':id/reconcile')
  @HttpCode(200)
  @RequirePermissions('PAYMENT_RECONCILE')
  @ApiOperation({ summary: 'POS - Quản lý / kế toán chốt ca đã đóng (không tự chốt ca của mình)' })
  @ApiOkResponse({ type: PosSessionResponseDto })
  @ApiBadRequestResponse({ description: 'Ca lệch tiền mà chưa có giải trình' })
  @ApiConflictResponse({ description: 'Ca chưa đóng hoặc đã chốt' })
  async reconcile(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReconcilePosSessionDto,
  ) {
    const session = await this.reconcilePosSessionUseCase.execute(userId, id, dto.note);
    return { message: 'Chốt ca thành công', data: PosSessionResponseDto.fromDomain(session) };
  }
}
