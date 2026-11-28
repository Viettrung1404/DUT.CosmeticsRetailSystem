import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { InventoryReservationService } from '../../application/services/inventory-reservation.service';

@Injectable()
export class ReservationCleanupScheduler {
  private readonly logger = new Logger(ReservationCleanupScheduler.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly reservationService: InventoryReservationService,
  ) {}

  /**
   * Cronjob định kỳ chạy mỗi phút để quét và giải phóng các reservation quá hạn
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('ReservationCleanupScheduler đang chạy lượt trước, bỏ qua lượt này.');
      return;
    }

    this.isRunning = true;
    try {
      const expiredCount = await this.processExpiredReservations();
      if (expiredCount > 0) {
        this.logger.log(
          `ReservationCleanupScheduler: Đã giải phóng thành công ${expiredCount} reservation hết hạn.`,
        );
      }
    } catch (error) {
      this.logger.error('Lỗi khi thực thi ReservationCleanupScheduler:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Quét và xử lý các reservation đã hết hạn thanh toán (expires_at < now và status = 'ACTIVE')
   * Sử dụng SELECT ... FOR UPDATE SKIP LOCKED bên trong Transaction để hỗ trợ multi-instance an toàn tuyệt đối.
   * 
   * @param limit Số lượng reservation tối đa xử lý trong một đợt (mặc định 100)
   * @param now Thời điểm tham chiếu (dành cho kiểm thử hoặc replay)
   * @returns Số lượng reservation đã được giải phóng thành công
   */
  async processExpiredReservations(
    limit: number = 100,
    now: Date = new Date(),
  ): Promise<number> {
    // 1. Quét danh sách ID các reservation hết hạn
    const candidates = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id
      FROM inventory_reservations
      WHERE status = 'ACTIVE'
        AND expires_at < ${now}
      ORDER BY expires_at ASC
      LIMIT ${limit}
    `);

    if (!candidates || candidates.length === 0) {
      return 0;
    }

    let processedCount = 0;

    // 2. Xử lý từng reservation với FOR UPDATE SKIP LOCKED
    for (const candidate of candidates) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // Khóa bi quan dòng với SKIP LOCKED, nếu worker khác đang giữ khóa thì bỏ qua ngay
          const [locked] = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
            SELECT id
            FROM inventory_reservations
            WHERE id = ${candidate.id}::uuid
              AND status = 'ACTIVE'
              AND expires_at < ${now}
            FOR UPDATE SKIP LOCKED
          `);

          if (!locked) {
            return;
          }

          await this.reservationService.releaseReservation(tx, candidate.id, {
            newStatus: 'EXPIRED',
            reason: 'Tự động giải phóng do quá hạn thanh toán (Reservation Expired)',
            now,
          });

          processedCount++;
        });
      } catch (err) {
        this.logger.error(
          `Lỗi khi giải phóng reservation hết hạn ${candidate.id}:`,
          err,
        );
      }
    }

    return processedCount;
  }
}
