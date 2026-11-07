import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ManageCampaignsUseCase } from '../../application/use-cases/manage-campaigns.use-case';

@Injectable()
export class CampaignSendScheduler {
  private readonly logger = new Logger(CampaignSendScheduler.name);
  private running = false;

  constructor(private readonly campaigns: ManageCampaignsUseCase) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handle() {
    if (this.running) return;
    this.running = true;
    try {
      const sent = await this.campaigns.sendDue();
      if (sent > 0) this.logger.log(`Đã gửi ${sent} chiến dịch hẹn giờ`);
    } catch (error) {
      this.logger.error('Gửi chiến dịch hẹn giờ thất bại', error);
    } finally {
      this.running = false;
    }
  }
}
