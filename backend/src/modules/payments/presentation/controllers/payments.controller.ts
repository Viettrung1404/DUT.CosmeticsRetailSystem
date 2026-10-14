import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { JwtPayload } from '@core/guards/jwt-auth.guard';
import { ApiResponseDto } from '@core/common/api-response.dto';
import { Gateway, ONLINE_METHODS } from '../../domain/payment-policy';
import { PaymentsService } from '../../application/services/payments.service';
import { CreatePaymentDto } from '../dtos/create-payment.dto';
import {
  PaymentResultDto,
  PaymentStatusDto,
} from '../dtos/payment-response.dto';

const envelope = (model: Function) => ({
  allOf: [
    { $ref: getSchemaPath(ApiResponseDto) },
    { properties: { data: { $ref: getSchemaPath(model) } } },
  ],
});

@ApiTags('Customer - Payments (Viá»‡t Trung)')
@ApiExtraModels(ApiResponseDto, PaymentResultDto, PaymentStatusDto)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}
  @Post(':gateway/create')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Táº¡o hoáº·c tÃ¡i sá»­ dá»¥ng lÆ°á»£t thanh toÃ¡n online' })
  @ApiParam({ name: 'gateway', enum: ['vnpay', 'momo', 'zalopay'] })
  @ApiOkResponse({ schema: envelope(PaymentResultDto) })
  @ApiAcceptedResponse({
    description: 'Khá»Ÿi táº¡o chÆ°a rÃµ káº¿t quáº£; dÃ¹ng status Ä‘á»ƒ Ä‘á»‘i soÃ¡t',
    schema: envelope(PaymentResultDto),
  })
  async create(
    @CurrentUser() user: JwtPayload,
    @Param('gateway') gateway: string,
    @Body() dto: CreatePaymentDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const method = gateway.toUpperCase() as Gateway;
    if (!ONLINE_METHODS.includes(method))
      throw new BadRequestException('Invalid payment gateway');
    const result = await this.service.create(
      user.userId,
      method,
      dto.orderId,
      dto.platform || 'WEB',
      req.ip || '127.0.0.1',
    );
    res.status(
      ['INITIATING', 'UNKNOWN', 'NEEDS_REVIEW'].includes(result.status)
        ? 202
        : 200,
    );
    return result;
  }
  @Get(':id/status')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Tra cá»©u tráº¡ng thÃ¡i payment/order thuá»™c tÃ i khoáº£n' })
  @ApiOkResponse({ schema: envelope(PaymentStatusDto) })
  status(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.status(user.userId, id);
  }
}

