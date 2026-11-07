import { Controller, Get, HttpCode, Inject, Logger, NotFoundException, Param, Post, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '@core/decorators/public.decorator';
import { RawResponse } from '@core/decorators/raw-response.decorator';
import { EmailTrackingService } from '../../application/services/email-tracking.service';
import {
  CAMPAIGN_REPOSITORY,
  ICampaignRepository,
} from '../../domain/repositories/campaign.repository.interface';

const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

const page = (message: string, form = '') => `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<title>GlowUp Cosmetics</title></head><body style="font-family:Arial,sans-serif;text-align:center;padding:64px 16px">
<h2>GlowUp Cosmetics</h2><p>${message}</p>${form}</body></html>`;

// Khách bấm từ hộp thư nên không có token đăng nhập; quyền truy cập nằm ở chữ ký của token
@ApiExcludeController()
@Public()
@Controller('email')
export class EmailTrackingController {
  private readonly logger = new Logger(EmailTrackingController.name);

  constructor(
    private readonly tracking: EmailTrackingService,
    @Inject(CAMPAIGN_REPOSITORY) private readonly repository: ICampaignRepository,
  ) {}

  @Get('o/:token')
  @RawResponse()
  async open(@Param('token') token: string, @Res() res: Response) {
    const payload = this.tracking.verify(token, 'open');
    if (payload) await this.record(payload.campaignId, payload.userId, 'OPEN');
    res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' });
    res.send(PIXEL);
  }

  @Get('c/:token')
  @RawResponse()
  async click(@Param('token') token: string, @Res() res: Response) {
    const payload = this.tracking.verify(token, 'click');
    if (!payload?.url) throw new NotFoundException('Liên kết không hợp lệ');
    await this.record(payload.campaignId, payload.userId, 'CLICK', payload.url);
    res.redirect(302, payload.url);
  }

  // GET chỉ hiện nút xác nhận: bộ quét thư tự mở link không được làm khách bị hủy nhận
  @Get('u/:token')
  @RawResponse()
  confirm(@Param('token') token: string, @Res() res: Response) {
    if (!this.tracking.verify(token, 'unsubscribe')) throw new NotFoundException('Liên kết không hợp lệ');
    res.type('html').send(
      page(
        'Bạn muốn ngừng nhận thư khuyến mãi từ GlowUp?',
        '<form method="post"><button type="submit" style="padding:8px 24px">Xác nhận hủy nhận</button></form>',
      ),
    );
  }

  @Post('u/:token')
  @HttpCode(200)
  @RawResponse()
  async unsubscribe(@Param('token') token: string, @Res() res: Response) {
    const payload = this.tracking.verify(token, 'unsubscribe');
    if (!payload) throw new NotFoundException('Liên kết không hợp lệ');
    await this.repository.setEmailOptOut(payload.userId, true);
    res.type('html').send(page('Bạn đã hủy nhận thư khuyến mãi. Thư về đơn hàng vẫn được gửi bình thường.'));
  }

  // Lỗi ghi thống kê không được chặn khách mở thư hay đi tới link
  private async record(campaignId: string, userId: string, type: 'OPEN' | 'CLICK', url?: string) {
    try {
      await this.repository.recordEmailEvent({ campaignId, userId, type, url: url ?? null });
    } catch (error) {
      this.logger.warn(`Không ghi được sự kiện email của chiến dịch ${campaignId}: ${String(error)}`);
    }
  }
}
