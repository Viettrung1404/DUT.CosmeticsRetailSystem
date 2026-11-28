import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Inject,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  OUTBOX_WRITER,
  IOutboxWriter,
} from '@modules/async-infrastructure/outbox/outbox-writer.interface';
import {
  ReconcileBatchDto,
  CodReconciliationResponseDto,
  CodReconciliationItemResponseDto,
  CodReconciliationQueryDto,
} from '../../presentation/dtos/cod-reconciliation.dto';

@Injectable()
export class CodReconciliationService {
  private readonly logger = new Logger(CodReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(OUTBOX_WRITER)
    private readonly outboxWriter?: IOutboxWriter,
  ) {}

  /**
   * Nhập bảng kê đối soát định kỳ của hãng vận chuyển (GHN / Ahamove)
   * 
   * Acceptance Criteria:
   * 1. Đối tác thu thiếu tiền (discrepancy != 0) -> Đánh dấu DISCREPANCY kèm số tiền lệch rõ ràng.
   * 2. Bảng kê khớp 100% -> Tự động chuyển trạng thái hoàn tất đối soát (APPROVED & SETTLED).
   */
  async reconcileBatch(
    dto: ReconcileBatchDto,
    approvedById?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CodReconciliationResponseDto> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Danh sách bưu kiện đối soát không được để trống.');
    }

    const runInTx = async (db: Prisma.TransactionClient) => {
      // 1. Kiểm tra chống import trùng kỳ (Idempotency / Concurrency Guard)
      const existing = await db.codReconciliation.findUnique({
        where: { reconciliationCode: dto.reconciliationCode },
      });

      if (existing) {
        throw new ConflictException(
          `Bảng kê đối soát với mã ${dto.reconciliationCode} đã tồn tại trong hệ thống. Vui lòng kiểm tra lại!`,
        );
      }

      // 2. Thu thập danh sách trackingCode để truy vấn các Shipment liên quan
      const trackingCodes = dto.items.map((i) => i.trackingCode.trim());
      const shipments = await db.shipment.findMany({
        where: {
          trackingCode: { in: trackingCodes },
        },
      });

      const shipmentMap = new Map<string, (typeof shipments)[0]>();
      shipments.forEach((s) => {
        if (s.trackingCode) {
          shipmentMap.set(s.trackingCode.trim().toUpperCase(), s);
        }
      });

      let totalCodDeclared = 0;
      let totalCodReceived = 0;
      let differenceAmount = 0;
      let matchedCount = 0;
      let discrepancyCount = 0;

      const processedItems: {
        shipmentId: string;
        shipmentCode: string;
        trackingCode: string;
        declaredCodAmount: number;
        carrierPaidCodAmount: number;
        discrepancyAmount: number;
        carrierFeeCharged: number;
        status: 'MATCHED' | 'DISCREPANCY';
        shipmentTargetStatus: string;
      }[] = [];

      for (const itemDto of dto.items) {
        const trackingUpper = itemDto.trackingCode.trim().toUpperCase();
        const shipment = shipmentMap.get(trackingUpper);

        if (!shipment) {
          throw new NotFoundException(
            `Không tìm thấy vận đơn trong hệ thống ứng với mã tracking: ${itemDto.trackingCode}`,
          );
        }

        const declaredCod = Number(shipment.codAmount || 0);
        const carrierPaid = Number(itemDto.carrierPaidCodAmount || 0);
        const discrepancy = declaredCod - carrierPaid;
        const feeCharged = Number(itemDto.carrierFeeCharged || 0);

        totalCodDeclared += declaredCod;
        totalCodReceived += carrierPaid;
        differenceAmount += discrepancy;

        // AC1: Nếu lệch tiền -> DISCREPANCY & SETTLEMENT_DISCREPANCY
        // AC2: Nếu khớp 100% -> MATCHED & SETTLED
        const isMatched = discrepancy === 0;
        const itemStatus: 'MATCHED' | 'DISCREPANCY' = isMatched
          ? 'MATCHED'
          : 'DISCREPANCY';
        const shipmentTargetStatus = isMatched
          ? 'SETTLED'
          : 'SETTLEMENT_DISCREPANCY';

        if (isMatched) {
          matchedCount++;
        } else {
          discrepancyCount++;
        }

        processedItems.push({
          shipmentId: shipment.id,
          shipmentCode: shipment.shipmentCode,
          trackingCode: itemDto.trackingCode,
          declaredCodAmount: declaredCod,
          carrierPaidCodAmount: carrierPaid,
          discrepancyAmount: discrepancy,
          carrierFeeCharged: feeCharged,
          status: itemStatus,
          shipmentTargetStatus,
        });
      }

      // Xác định trạng thái tổng thể của bảng kê
      const batchStatus =
        discrepancyCount === 0 ? 'APPROVED' : 'DISCREPANCY_FLAGGED';

      // 3. Tạo bảng kê CodReconciliation
      const recDate = new Date(dto.reconciliationDate);
      const reconciliation = await db.codReconciliation.create({
        data: {
          reconciliationCode: dto.reconciliationCode,
          carrierCode: dto.carrierCode.toUpperCase(),
          reconciliationDate: recDate,
          totalCodDeclared: new Prisma.Decimal(totalCodDeclared),
          totalCodReceived: new Prisma.Decimal(totalCodReceived),
          differenceAmount: new Prisma.Decimal(differenceAmount),
          status: batchStatus,
          bankStatementRef: dto.bankStatementRef || null,
          approvedBy: approvedById || null,
        },
      });

      // 4. Tạo chi tiết từng dòng CodReconciliationItem & cập nhật trạng thái Shipment
      const createdItemDtos: CodReconciliationItemResponseDto[] = [];
      for (const item of processedItems) {
        const recItem = await db.codReconciliationItem.create({
          data: {
            reconciliationId: reconciliation.id,
            shipmentId: item.shipmentId,
            declaredCodAmount: new Prisma.Decimal(item.declaredCodAmount),
            carrierPaidCodAmount: new Prisma.Decimal(item.carrierPaidCodAmount),
            discrepancyAmount: new Prisma.Decimal(item.discrepancyAmount),
            carrierFeeCharged: new Prisma.Decimal(item.carrierFeeCharged),
            status: item.status,
          },
        });

        // Cập nhật trạng thái Shipment: SETTLED hoặc SETTLEMENT_DISCREPANCY
        await db.shipment.update({
          where: { id: item.shipmentId },
          data: {
            codStatus: item.shipmentTargetStatus,
          },
        });

        createdItemDtos.push({
          id: recItem.id,
          shipmentId: item.shipmentId,
          shipmentCode: item.shipmentCode,
          trackingCode: item.trackingCode,
          declaredCodAmount: item.declaredCodAmount,
          carrierPaidCodAmount: item.carrierPaidCodAmount,
          discrepancyAmount: item.discrepancyAmount,
          carrierFeeCharged: item.carrierFeeCharged,
          status: item.status,
        });
      }

      // 5. Phát Transactional Outbox Event COD_RECONCILIATION_COMPLETED
      if (this.outboxWriter) {
        await this.outboxWriter.record(db, {
          aggregateType: 'COD_RECONCILIATION',
          aggregateId: reconciliation.id,
          eventType: 'COD_RECONCILIATION_COMPLETED',
          occurredAt: new Date(),
          payload: {
            reconciliationId: reconciliation.id,
            reconciliationCode: reconciliation.reconciliationCode,
            carrierCode: reconciliation.carrierCode,
            totalCodDeclared,
            totalCodReceived,
            differenceAmount,
            status: batchStatus,
            totalItems: dto.items.length,
            matchedCount,
            discrepancyCount,
            reconciliationDate: dto.reconciliationDate,
          },
        });
      }

      this.logger.log(
        `Hoàn tất đối soát bảng kê ${dto.reconciliationCode} (${dto.carrierCode}): ` +
          `Status=${batchStatus}, Total=${dto.items.length}, Matched=${matchedCount}, Discrepancies=${discrepancyCount}`,
      );

      return {
        id: reconciliation.id,
        reconciliationCode: reconciliation.reconciliationCode,
        carrierCode: reconciliation.carrierCode,
        reconciliationDate: dto.reconciliationDate,
        totalCodDeclared,
        totalCodReceived,
        differenceAmount,
        status: batchStatus,
        bankStatementRef: reconciliation.bankStatementRef,
        totalItems: dto.items.length,
        matchedCount,
        discrepancyCount,
        items: createdItemDtos,
        createdAt: reconciliation.createdAt,
      };
    };

    if (tx) {
      return runInTx(tx);
    }
    return this.prisma.$transaction(runInTx);
  }

  /**
   * Truy vấn thông tin chi tiết một bảng kê đối soát theo ID
   */
  async getReconciliation(id: string): Promise<CodReconciliationResponseDto> {
    const rec = await this.prisma.codReconciliation.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            shipment: true,
          },
        },
      },
    });

    if (!rec) {
      throw new NotFoundException(`Không tìm thấy bảng kê đối soát với ID: ${id}`);
    }

    const itemsDto: CodReconciliationItemResponseDto[] = rec.items.map((item) => ({
      id: item.id,
      shipmentId: item.shipmentId,
      shipmentCode: item.shipment?.shipmentCode,
      trackingCode: item.shipment?.trackingCode || '',
      declaredCodAmount: Number(item.declaredCodAmount),
      carrierPaidCodAmount: Number(item.carrierPaidCodAmount),
      discrepancyAmount: Number(item.discrepancyAmount),
      carrierFeeCharged: Number(item.carrierFeeCharged),
      status: item.status,
    }));

    const matchedCount = itemsDto.filter((i) => i.status === 'MATCHED').length;
    const discrepancyCount = itemsDto.filter((i) => i.status === 'DISCREPANCY').length;

    return {
      id: rec.id,
      reconciliationCode: rec.reconciliationCode,
      carrierCode: rec.carrierCode,
      reconciliationDate: rec.reconciliationDate.toISOString().slice(0, 10),
      totalCodDeclared: Number(rec.totalCodDeclared),
      totalCodReceived: Number(rec.totalCodReceived),
      differenceAmount: Number(rec.differenceAmount),
      status: rec.status,
      bankStatementRef: rec.bankStatementRef,
      totalItems: itemsDto.length,
      matchedCount,
      discrepancyCount,
      items: itemsDto,
      createdAt: rec.createdAt,
    };
  }

  /**
   * Danh sách bảng kê đối soát có lọc và phân trang
   */
  async listReconciliations(query: CodReconciliationQueryDto) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Number(query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.CodReconciliationWhereInput = {
      carrierCode: query.carrierCode ? query.carrierCode.toUpperCase() : undefined,
      status: query.status ? query.status : undefined,
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.codReconciliation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          items: true,
        },
      }),
      this.prisma.codReconciliation.count({ where }),
    ]);

    const items = rows.map((r) => {
      const matchedCount = r.items.filter((i) => i.status === 'MATCHED').length;
      const discrepancyCount = r.items.filter((i) => i.status === 'DISCREPANCY').length;

      return {
        id: r.id,
        reconciliationCode: r.reconciliationCode,
        carrierCode: r.carrierCode,
        reconciliationDate: r.reconciliationDate.toISOString().slice(0, 10),
        totalCodDeclared: Number(r.totalCodDeclared),
        totalCodReceived: Number(r.totalCodReceived),
        differenceAmount: Number(r.differenceAmount),
        status: r.status,
        bankStatementRef: r.bankStatementRef,
        totalItems: r.items.length,
        matchedCount,
        discrepancyCount,
        createdAt: r.createdAt,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
