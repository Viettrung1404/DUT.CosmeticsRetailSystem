import { Module } from '@nestjs/common';
import { OutboxWriterService } from './outbox/outbox-writer.service';
import { OUTBOX_WRITER } from './outbox/outbox-writer.interface';

@Module({
  providers: [
    OutboxWriterService,
    {
      provide: OUTBOX_WRITER,
      useExisting: OutboxWriterService,
    },
  ],
  exports: [OutboxWriterService, OUTBOX_WRITER],
})
export class AsyncInfrastructureModule {}
