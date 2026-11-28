import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { OutboxWriterService } from './outbox/outbox-writer.service';
import { OUTBOX_WRITER } from './outbox/outbox-writer.interface';
import {
  CloudflareQueueClient,
  CLOUDFLARE_QUEUE_CLIENT,
} from './outbox/cloudflare-queue.client';
import { OutboxRelayScheduler } from './outbox/outbox-relay.scheduler';
import { WebhookInboxService } from './webhooks/webhook-inbox.service';
import { WebhookProcessorService } from './webhooks/webhook-processor.service';
import { WebhookIngressController } from './webhooks/webhook-ingress.controller';
import { InternalWebhookController } from './webhooks/internal-webhook.controller';
import { InternalTokenGuard } from './webhooks/internal-token.guard';
import { DlqAlertService } from './operations/dlq-alert.service';
import { DlqOperationsService } from './operations/dlq-operations.service';
import { DlqOperationsController } from './operations/dlq-operations.controller';

@Module({
  imports: [PrismaModule, ConfigModule, PermissionsModule],
  controllers: [
    WebhookIngressController,
    InternalWebhookController,
    DlqOperationsController,
  ],
  providers: [
    OutboxWriterService,
    {
      provide: OUTBOX_WRITER,
      useExisting: OutboxWriterService,
    },
    CloudflareQueueClient,
    {
      provide: CLOUDFLARE_QUEUE_CLIENT,
      useExisting: CloudflareQueueClient,
    },
    OutboxRelayScheduler,
    InternalTokenGuard,
    WebhookInboxService,
    WebhookProcessorService,
    DlqAlertService,
    DlqOperationsService,
  ],
  exports: [
    OutboxWriterService,
    OUTBOX_WRITER,
    CloudflareQueueClient,
    CLOUDFLARE_QUEUE_CLIENT,
    OutboxRelayScheduler,
    InternalTokenGuard,
    WebhookInboxService,
    WebhookProcessorService,
    DlqAlertService,
    DlqOperationsService,
  ],
})
export class AsyncInfrastructureModule {}



