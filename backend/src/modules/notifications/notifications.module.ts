import { Module } from '@nestjs/common';
import { NotificationsService } from './application/services/notifications.service';
import {
  OUTBOX_MAILER,
} from './application/ports/outbox-mailer.port';
import { SmtpOutboxMailer } from './infrastructure/mail/smtp-outbox.mailer';
import { EmailOutboxWorker } from './infrastructure/workers/email-outbox.worker';
import { NotificationsController } from './presentation/controllers/notifications.controller';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailOutboxWorker,
    { provide: OUTBOX_MAILER, useClass: SmtpOutboxMailer },
  ],
})
export class NotificationsModule {}
