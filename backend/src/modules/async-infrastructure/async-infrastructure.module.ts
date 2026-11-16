import { Module } from '@nestjs/common';
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

@Module({
  controllers: [WebhookIngressController, InternalWebhookController],
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
  ],
})
export class AsyncInfrastructureModule {}



