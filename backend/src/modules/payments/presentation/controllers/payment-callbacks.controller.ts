import {
  Controller,
  Get,
  HttpException,
  Inject,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from '@core/decorators/public.decorator';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Gateway } from '../../domain/payment-policy';
import {
  PAYMENT_GATEWAYS,
  PaymentsService,
} from '../../application/services/payments.service';
import { GatewayAdapter } from '../../infrastructure/gateways/gateway-adapters';

@Public()
@ApiTags('Payment callbacks')
@Controller('payments')
export class PaymentCallbacksController {
  constructor(
    private readonly service: PaymentsService,
    @Inject(PAYMENT_GATEWAYS)
    private readonly gateways: Record<Gateway, GatewayAdapter>,
    private readonly db: PrismaService,
  ) {}
  @Get('vnpay/ipn')
  @ApiOperation({ summary: 'VNPay native GET IPN' })
  vnpay(@Req() req: Request, @Res() res: Response) {
    return this.receive('VNPAY', req.query, res);
  }
  @Post('momo/ipn')
  @ApiOperation({ summary: 'MoMo signed IPN; HTTP 204 after durable receipt' })
  momo(@Req() req: Request & { rawBody?: Buffer }, @Res() res: Response) {
    return this.receive('MOMO', req.rawBody?.toString('utf8') || '', res);
  }
  @Post('zalopay/callback')
  @ApiOperation({
    summary: 'ZaloPay callback; key2 HMAC of original data string',
  })
  zalo(@Req() req: Request & { rawBody?: Buffer }, @Res() res: Response) {
    return this.receive('ZALOPAY', req.rawBody?.toString('utf8') || '', res);
  }
  private async receive(gateway: Gateway, raw: any, res: Response) {
    try {
      const observation = this.gateways[gateway].callback(raw);
      const duplicate = await this.service.receive(observation);
      if (gateway === 'MOMO') return res.status(204).end();
      if (gateway === 'ZALOPAY')
        return res
          .status(200)
          .json({ return_code: 1, return_message: 'ThÃ nh cÃ´ng' });
      return res.status(200).json({
        RspCode: duplicate ? '02' : '00',
        Message: duplicate ? 'Order already confirmed' : 'Confirm Success',
      });
    } catch (e) {
      const status = e instanceof HttpException ? e.getStatus() : 503;
      if (gateway === 'VNPAY') {
        const response = e instanceof HttpException ? e.getResponse() : null;
        const code =
          typeof response === 'object' && response && 'code' in response
            ? response['code']
            : '';
        return res.status(200).json({
          RspCode:
            status === 404
              ? '01'
              : code === 'PAYMENT_INVALID_AMOUNT'
                ? '04'
                : status === 400
                  ? '97'
                  : '99',
          Message: 'Callback rejected',
        });
      }
      if (gateway === 'ZALOPAY' && status < 500)
        return res
          .status(200)
          .json({ return_code: 2, return_message: 'Tháº¥t báº¡i' });
      return res.status(status >= 500 ? 503 : 400).end();
    }
  }
  @Get('vnpay/callback')
  @ApiOperation({ summary: 'Browser return; never confirms an order' })
  vnpReturn(@Query('state') state: string, @Res() res: Response) {
    return this.returnPage(state, 'VNPAY', res);
  }
  @Get('momo/callback')
  momoReturn(@Query('state') state: string, @Res() res: Response) {
    return this.returnPage(state, 'MOMO', res);
  }
  @Get('zalopay/return')
  zaloReturn(@Query('state') state: string, @Res() res: Response) {
    return this.returnPage(state, 'ZALOPAY', res);
  }
  private async returnPage(state: string, gateway: Gateway, res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (typeof state !== 'string' || !/^[a-f0-9]{64}$/.test(state))
      return res.status(400).send('LiÃªn káº¿t thanh toÃ¡n khÃ´ng há»£p lá»‡');
    const payment = await this.db.payment.findFirst({
      where: {
        returnState: state,
        paymentMethod: gateway,
        returnStateExpiresAt: { gt: new Date() },
      },
      select: { id: true, platform: true },
    });
    if (!payment) return res.status(410).send('LiÃªn káº¿t thanh toÃ¡n Ä‘Ã£ háº¿t háº¡n');
    const web = new URL(process.env.PAYMENT_WEB_RETURN_URL!);
    web.searchParams.set('paymentId', payment.id);
    if (payment.platform !== 'MOBILE') return res.redirect(303, web.toString());
    const link = `glowup://payment/return?paymentId=${encodeURIComponent(payment.id)}`;
    const escape = (s: string) =>
      s.replace(
        /[&<>"']/g,
        (c) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          })[c]!,
      );
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    );
    return res
      .status(200)
      .type('html')
      .send(
        `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Quay láº¡i GlowUp</title><body><h1>Quay láº¡i GlowUp</h1><p>á»¨ng dá»¥ng sáº½ kiá»ƒm tra tráº¡ng thÃ¡i thanh toÃ¡n cá»§a báº¡n.</p><p><a href="${escape(link)}">Má»Ÿ á»©ng dá»¥ng GlowUp</a></p><p><a href="${escape(web.toString())}">Tiáº¿p tá»¥c trÃªn Web</a></p></body></html>`,
      );
  }
}

