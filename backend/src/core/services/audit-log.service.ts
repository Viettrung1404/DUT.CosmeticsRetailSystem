import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface RecordTransitionParams {
  entityType: 'ORDER' | 'FULFILLMENT_ORDER' | 'SHIPMENT' | 'RETURN_REQUEST' | string;
  entityId: string;
  fromStatus: string;
  toStatus: string;
  action: string;
  actorType?: 'CUSTOMER' | 'ADMIN_USER' | 'SYSTEM_WORKER' | 'CARRIER_WEBHOOK' | string;
  actorId?: string | null;
  reason?: string | null;
  metadata?: Record<string, any> | null;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ghi nhận lịch sử chuyển trạng thái vào bảng domain_status_histories (DES-07 EP11-T03 AC2).
   * Có thể thực thi trong cùng ACID Transaction với thay đổi nghiệp vụ.
   */
  async recordTransition(
    tx: Prisma.TransactionClient | PrismaService | undefined,
    params: RecordTransitionParams,
  ) {
    const db = tx || this.prisma;
    const actorType = params.actorType || (params.actorId ? 'ADMIN_USER' : 'SYSTEM_WORKER');

    const entry = await db.domainStatusHistory.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        fromStatus: params.fromStatus,
        toStatus: params.toStatus,
        actionPerformed: params.action,
        actorType,
        actorId: params.actorId || null,
        reason: params.reason || null,
        metadata: params.metadata || Prisma.JsonNull,
      },
    });

    this.logger.debug(
      `[AuditLog] ${params.entityType} (${params.entityId}): ${params.fromStatus} -> ${params.toStatus} [Action: ${params.action}] by ${actorType} (${params.actorId || 'system'})`,
    );

    return entry;
  }

  /**
   * Truy vấn toàn bộ lịch sử thay đổi trạng thái của một thực thể theo thứ tự thời gian giảm dần.
   */
  async getEntityHistory(entityType: string, entityId: string) {
    return this.prisma.domainStatusHistory.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: {
        occurredAt: 'desc',
      },
    });
  }
}
