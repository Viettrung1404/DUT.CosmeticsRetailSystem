import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/require-permissions.decorator';
import { CreatePosOrderUseCase } from '../../application/use-cases/create-pos-order.use-case';
import { PreviewPosOrderUseCase } from '../../application/use-cases/preview-pos-order.use-case';
import { CreatePosOrderDto, PreviewPosOrderDto } from '../dtos/pos-order-request.dto';
import { PosOrderCreatedResponseDto, PosPreviewResponseDto } from '../dtos/pos-order-response.dto';

@ApiTags('POS - Sales (Thành Lập)')
@ApiBearerAuth('JWT-auth')
@Controller('pos/orders')
export class PosOrderController {
  constructor(
    private readonly previewPosOrderUseCase: PreviewPosOrderUseCase,
    private readonly createPosOrderUseCase: CreatePosOrderUseCase,
  ) {}

  @Post('preview')
  @HttpCode(200)
  @RequirePermissions('ORDER_POS_CREATE')
  @ApiOperation({ summary: 'POS - Tính tiền giỏ hàng (không ghi DB): khuyến mãi, voucher, điểm, tồn bán được' })
  @ApiOkResponse({ type: PosPreviewResponseDto })
  @ApiBadRequestResponse({ description: 'Voucher / điểm không hợp lệ, sản phẩm ngừng bán' })
  @ApiForbiddenResponse({ description: 'Không được gán cửa hàng này hoặc thiếu quyền áp mã' })
  async preview(
    @CurrentUser('userId') userId: string,
    @CurrentUser('permissionCodes') permissionCodes: string[],
    @Body() dto: PreviewPosOrderDto,
  ) {
    const result = await this.previewPosOrderUseCase.execute(userId, permissionCodes ?? [], dto);
    return PosPreviewResponseDto.fromPreview(result);
  }

  @Post()
  @RequirePermissions('ORDER_POS_CREATE', 'PAYMENT_COLLECT')
  @ApiOperation({ summary: 'POS - Bán hàng một bước: tạo đơn, trừ kho FEFO, thu tiền, tích điểm, hoa hồng' })
  @ApiBadRequestResponse({ description: 'Tiền thu sai, voucher / điểm không hợp lệ' })
  @ApiConflictResponse({ description: 'Chưa mở ca tại cửa hàng này, hoặc không đủ hàng' })
  @ApiForbiddenResponse({ description: 'Không được gán cửa hàng này' })
  async create(
    @CurrentUser('userId') userId: string,
    @CurrentUser('permissionCodes') permissionCodes: string[],
    @Body() dto: CreatePosOrderDto,
  ) {
    const result = await this.createPosOrderUseCase.execute(userId, permissionCodes ?? [], dto);
    const messages = ['Bán hàng thành công'];
    if (result.sale.pointsNote) messages.push(result.sale.pointsNote);
    return { message: messages.join('. '), data: PosOrderCreatedResponseDto.fromResult(result) };
  }
}
