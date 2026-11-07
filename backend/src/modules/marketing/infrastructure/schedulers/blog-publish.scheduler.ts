import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ManageContentUseCase } from '../../application/use-cases/manage-content.use-case';

@Injectable()
export class BlogPublishScheduler {
  private readonly logger = new Logger(BlogPublishScheduler.name);

  constructor(private readonly content: ManageContentUseCase) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handle() {
    try {
      const published = await this.content.publishDue();
      if (published > 0) this.logger.log(`Đã đăng ${published} bài viết hẹn giờ`);
    } catch (error) {
      this.logger.error('Đăng bài hẹn giờ thất bại', error);
    }
  }
}
