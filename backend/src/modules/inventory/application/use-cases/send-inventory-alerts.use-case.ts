import { Inject, Injectable } from '@nestjs/common';
import { nearExpiryThreshold, startOfVnToday } from '@core/utils/expiry-policy.util';
import {
  AlertNotification,
  IInventoryAlertRepository,
  INVENTORY_ALERT_REPOSITORY,
} from '../../domain/repositories/inventory-alert.repository.interface';

const MAX_LISTED_SKUS = 10;

// T10: mỗi sáng gửi một thông báo tổng hợp cho từng người phụ trách mỗi địa điểm
@Injectable()
export class SendInventoryAlertsUseCase {
  constructor(
    @Inject(INVENTORY_ALERT_REPOSITORY) private readonly repository: IInventoryAlertRepository,
  ) {}

  async execute(now: Date = new Date()): Promise<number> {
    const today = startOfVnToday(now);
    const summaries = await this.repository.summarize(today, nearExpiryThreshold(now));
    if (!summaries.length) return 0;

    const recipients = await this.repository.findRecipients(summaries.map((s) => s.storeId));
    const day = today.toISOString().slice(0, 10);
    const rows: AlertNotification[] = [];
    for (const summary of summaries) {
      const parts: string[] = [];
      if (summary.lowStock.length) parts.push(`${summary.lowStock.length} sản phẩm dưới mức tồn tối thiểu`);
      if (summary.nearExpiryBatches) parts.push(`${summary.nearExpiryBatches} lô cận date (dưới 3 tháng)`);
      if (summary.expiredBatches) parts.push(`${summary.expiredBatches} lô đã hết hạn cần xuất hủy`);
      for (const r of recipients.filter((x) => x.storeId === summary.storeId)) {
        rows.push({
          userId: r.userId,
          title: `Cảnh báo kho ${summary.storeName}`,
          message: `${parts.join(', ')}.`,
          data: {
            storeId: summary.storeId,
            lowStock: summary.lowStock.slice(0, MAX_LISTED_SKUS),
            nearExpiryBatches: summary.nearExpiryBatches,
            expiredBatches: summary.expiredBatches,
          },
          eventKey: `INVENTORY_ALERT:${summary.storeId}:${r.userId}:${day}`,
        });
      }
    }
    return this.repository.createNotifications(rows);
  }
}
