import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@core/decorators/public.decorator';
import { CommerceCheckoutService } from '../../application/services/commerce-checkout.service';
import { PaymentsService } from '@modules/payments/application/services/payments.service';
import { CreateOrderDto } from '../dtos/create-order.dto';
import { PreviewOrderDto } from '../dtos/preview-order.dto';

@Public()
@ApiTags('Guest - Checkout')
@ApiHeader({
  name: 'x-session-id',
  required: true,
  description: 'Secret guest cart session UUID v4; never expose it in a URL',
})
@Controller('guest')
export class GuestCheckoutController {
  constructor(
    private readonly checkout: CommerceCheckoutService,
    private readonly payments: PaymentsService,
  ) {}
  @Post('orders/preview')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary: 'Báo giá cho guest, không áp dụng điểm/quyền lợi tài khoản',
  })
  preview(
    @Headers('x-session-id') session: string,
    @Body() input: PreviewOrderDto,
  ) {
    return this.checkout.previewGuest(input, session);
  }
  @Post('orders')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({
    summary: 'Tạo đơn guest COD/VNPAY với idempotency bền vững theo phiên',
  })
  create(
    @Headers('x-session-id') session: string,
    @Headers('idempotency-key') key: string,
    @Body() input: CreateOrderDto,
  ) {
    return this.checkout.createGuest(
      { ...input, idempotencyKey: key },
      session,
    );
  }
  @Get('orders/:id')
  @ApiOperation({ summary: 'Đọc đơn thuộc đúng phiên guest' })
  detail(
    @Headers('x-session-id') session: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.checkout.guestOrder(session, id);
  }
  @Post('payments/vnpay')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Tạo/khôi phục thanh toán VNPAY cho đơn thuộc phiên guest',
  })
  payment(
    @Headers('x-session-id') session: string,
    @Body('orderId', ParseUUIDPipe) id: string,
    @Req() req: { ip: string },
  ) {
    return this.payments.createGuest(session, id, req.ip);
  }
  @Get('payments/:id/status')
  @ApiOperation({ summary: 'Trạng thái thanh toán thuộc phiên guest' })
  status(
    @Headers('x-session-id') session: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payments.statusGuest(session, id);
  }
}
