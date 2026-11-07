import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SendInventoryAlertsUseCase } from '../../application/use-cases/send-inventory-alerts.use-case';

@Injectable()
export class InventoryAlertScheduler {
  private readonly logger = new Logger(InventoryAlertScheduler.name);

  constructor(private readonly sendInventoryAlerts: SendInventoryAlertsUseCase) {}

  @Cron('0 7 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async handle() {
    try {
      const sent = await this.sendInventoryAlerts.execute();
      if (sent > 0) this.logger.log(`Đã gửi ${sent} thông báo cảnh báo kho`);
    } catch (error) {
      this.logger.error('Gửi cảnh báo kho thất bại', error);
    }
  }
}
