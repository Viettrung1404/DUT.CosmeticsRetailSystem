import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CustomerEventIntegration } from '@modules/customer-commerce/application/admin-integration.service';
import {
  ADMIN_ORDER_REPOSITORY,
  IAdminOrderRepository,
} from '@modules/orders/domain/repositories/admin-order.repository.interface';
import { OrderStatus } from '@core/domain/orders/order-status.enum';
import {
  ApplyCarrierEventInput,
  ApplyCarrierEventResult,
  CreateShipmentRecord,
  IShipmentRepository,
  OrderForShipment,
  ShipmentAccessInfo,
  ShipmentDetail,
  ShipmentListItem,
  ShipmentListQuery,
} from '../../domain/repositories/shipment.repository.interface';
import {
  canCancelShipment,
  canShipmentTransition,
  isActiveShipment,
} from '../../domain/shipment-status';

const TX_OPTIONS = { timeout: 30000, maxWait: 10000 };

const LIST_INCLUDE = {
  order: { select: { orderNumber: true, storeId: true, store: { select: { name: true } } } },
} satisfies Prisma.ShipmentInclude;

type ShipmentRow = Prisma.ShipmentGetPayload<{ include: typeof LIST_INCLUDE }>;

@Injectable()
export class PrismaShipmentRepository implements IShipmentRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integration: CustomerEventIntegration,
    @Inject(ADMIN_ORDER_REPOSITORY) private readonly orders: IAdminOrderRepository,
  ) {}

  async findAccessInfo(shipmentId: string): Promise<ShipmentAccessInfo | null> {
    const row = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: {
        id: true,
        orderId: true,
        carrierCode: true,
        trackingCode: true,
        status: true,
        order: { select: { storeId: true } },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      orderId: row.orderId,
      storeId: row.order.storeId,
      carrierCode: row.carrierCode,
      trackingCode: row.trackingCode,
      status: row.status,
    };
  }

  async findOrderForShipment(orderId: string): Promise<OrderForShipment | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        storeId: true,
        orderType: true,
        status: true,
        shippingFee: true,
        totalAmount: true,
        totalWeightGrams: true,
        shippingAddress: true,
        exchangeSettlement: { select: { creditApplied: true } },
        shipments: { select: { status: true } },
      },
    });
    if (!order) return null;
    const paid = await this.prisma.payment.aggregate({
      where: { orderId, status: 'COMPLETED' },
      _sum: { amount: true },
    });
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      storeId: order.storeId,
      orderType: order.orderType,
      status: order.status,
      shippingFee: Number(order.shippingFee),
      totalAmount: Number(order.totalAmount),
      totalWeightGrams: order.totalWeightGrams,
      shippingAddress: order.shippingAddress as OrderForShipment['shippingAddress'],
      completedPaid: Number(paid._sum.amount ?? 0),
      exchangeCredit: Number(order.exchangeSettlement?.creditApplied ?? 0),
      hasActiveShipment: order.shipments.some((s) => isActiveShipment(s.status)),
    };
  }

  async findDetail(shipmentId: string): Promise<ShipmentDetail | null> {
    const row = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        order: {
          select: {
            orderNumber: true,
            storeId: true,
            status: true,
            shippingAddress: true,
            store: { select: { name: true } },
          },
        },
        events: { orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }] },
      },
    });
    if (!row) return null;
    const address = row.order.shippingAddress as OrderForShipment['shippingAddress'];
    return {
      ...this.toListItem(row as unknown as ShipmentRow),
      carrierServiceCode: row.carrierServiceCode,
      shippingLabelUrl: row.shippingLabelUrl,
      recipientName: address?.recipientName ?? null,
      recipientPhone: address?.phone ?? null,
      recipientAddress: address
        ? [address.addressLine, address.ward, address.district, address.city].filter(Boolean).join(', ')
        : null,
      orderStatus: row.order.status,
      events: row.events.map((e) => ({
        id: e.id,
        status: e.status,
        occurredAt: e.occurredAt,
        receivedAt: e.receivedAt,
      })),
    };
  }

  async findMany(query: ShipmentListQuery): Promise<{ items: ShipmentListItem[]; total: number }> {
    const and: Prisma.ShipmentWhereInput[] = [];
    if (query.storeIds) and.push({ order: { storeId: { in: query.storeIds } } });
    if (query.status) and.push({ status: query.status });
    if (query.carrierCode) and.push({ carrierCode: query.carrierCode });
    if (query.orderId) and.push({ orderId: query.orderId });
    if (query.from || query.to) and.push({ createdAt: { gte: query.from, lte: query.to } });
    if (query.search) {
      and.push({
        OR: [
          { shipmentCode: { contains: query.search, mode: 'insensitive' } },
          { trackingCode: { contains: query.search, mode: 'insensitive' } },
          { order: { orderNumber: { contains: query.search, mode: 'insensitive' } } },
        ],
      });
    }
    const where: Prisma.ShipmentWhereInput = and.length ? { AND: and } : {};
    const [rows, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.shipment.count({ where }),
    ]);
    return { items: rows.map((r) => this.toListItem(r)), total };
  }

  async create(record: CreateShipmentRecord): Promise<string> {
    return this.prisma.transaction(async (tx) => {
      const order = await this.lockOrder(tx, record.orderId);
      if (order.status !== OrderStatus.PROCESSING) throw new ConflictException('SHIPMENT_ORDER_STATE_INVALID');
      const existing = await tx.shipment.findMany({ where: { orderId: record.orderId }, select: { status: true } });
      if (existing.some((s) => isActiveShipment(s.status))) throw new ConflictException('SHIPMENT_ALREADY_EXISTS');
      const shipment = await tx.shipment.create({
        data: {
          orderId: record.orderId,
          shipmentCode: record.shipmentCode,
          carrierCode: record.carrierCode,
          carrierServiceCode: record.serviceCode,
          trackingCode: record.trackingCode,
          codAmount: record.codAmount,
          shippingFeePaid: record.shippingFee,
          status: 'READY_TO_SHIP',
          shippingLabelUrl: record.labelUrl,
          carrierMetadata: { ...(record.metadata ?? {}), createdBy: record.createdBy } as Prisma.InputJsonValue,
        },
      });
      await this.integration.shipmentChanged(tx, {
        shipmentId: shipment.id,
        carrierCode: record.carrierCode,
        eventId: `CREATED:${shipment.id}`,
        status: 'READY_TO_SHIP',
        occurredAt: new Date(),
      });
      await tx.auditLog.create({
        data: {
          userId: record.createdBy,
          action: 'SHIPMENT_CREATE',
          entityType: 'shipment',
          entityId: shipment.id,
          newData: { orderId: record.orderId, carrierCode: record.carrierCode, trackingCode: record.trackingCode },
        },
      });
      return shipment.id;
    }, TX_OPTIONS);
  }

  async cancel(shipmentId: string, actorId: string): Promise<void> {
    await this.prisma.transaction(async (tx) => {
      const base = await tx.shipment.findUnique({ where: { id: shipmentId }, select: { orderId: true } });
      if (!base) throw new NotFoundException('SHIPMENT_NOT_FOUND');
      await this.lockOrder(tx, base.orderId);
      await tx.$queryRaw`SELECT id FROM shipments WHERE id=${shipmentId}::uuid FOR UPDATE`;
      const row = await tx.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
      if (!canCancelShipment(row.status)) throw new ConflictException('SHIPMENT_CANCEL_NOT_ALLOWED');
      await this.integration.shipmentChanged(tx, {
        shipmentId,
        carrierCode: row.carrierCode,
        eventId: `ADMIN_CANCEL:${shipmentId}`,
        status: 'CANCELLED',
        occurredAt: new Date(),
      });
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'SHIPMENT_CANCEL',
          entityType: 'shipment',
          entityId: shipmentId,
          oldData: { status: row.status },
          newData: { status: 'CANCELLED' },
        },
      });
    }, TX_OPTIONS);
  }

  async applyCarrierEvent(input: ApplyCarrierEventInput): Promise<ApplyCarrierEventResult> {
    return this.prisma.transaction(async (tx) => {
      const found = await tx.shipment.findFirst({
        where: { carrierCode: input.carrierCode, trackingCode: input.trackingCode },
        select: { id: true, orderId: true },
      });
      if (!found) throw new NotFoundException('SHIPMENT_NOT_FOUND');
      const order = await this.lockOrder(tx, found.orderId);
      await tx.$queryRaw`SELECT id FROM shipments WHERE id=${found.id}::uuid FOR UPDATE`;
      const shipment = await tx.shipment.findUniqueOrThrow({ where: { id: found.id } });
      const event = {
        shipmentId: shipment.id,
        carrierCode: input.carrierCode,
        eventId: input.eventId,
        status: input.status,
        occurredAt: input.occurredAt,
      };

      const duplicate = await tx.shipmentEvent.findUnique({
        where: { carrierCode_eventId: { carrierCode: input.carrierCode, eventId: input.eventId } },
      });
      if (duplicate) {
        // shipmentChanged kiểm sự kiện gửi lại phải giống hệt bản đã nhận, khác thì báo xung đột
        await this.integration.shipmentChanged(tx, event);
        return {
          shipmentId: shipment.id,
          orderId: order.id,
          status: shipment.status,
          duplicate: true,
          orderStatus: order.status,
        };
      }

      if (!canShipmentTransition(shipment.status, input.status)) {
        throw new ConflictException('SHIPMENT_INVALID_TRANSITION');
      }
      const latest = await tx.shipmentEvent.findFirst({
        where: { shipmentId: shipment.id },
        orderBy: { occurredAt: 'desc' },
      });
      if (latest && input.occurredAt < latest.occurredAt) throw new ConflictException('SHIPMENT_EVENT_STALE');

      const actorId = this.creatorOf(shipment.carrierMetadata);
      const note = `Vận đơn ${shipment.shipmentCode}`;
      let orderStatus = order.status;
      if (input.status === 'PICKED_UP') {
        orderStatus = await this.moveOrder(tx, order, OrderStatus.PROCESSING, OrderStatus.SHIPPING, actorId, `${note}: hãng đã lấy hàng`);
      } else if (input.status === 'DELIVERED') {
        orderStatus = await this.moveOrder(tx, order, OrderStatus.SHIPPING, OrderStatus.DELIVERED, actorId, `${note}: giao thành công, đã thu tiền`);
      } else if (input.status === 'RETURNED') {
        orderStatus = await this.moveOrder(
          tx,
          order,
          OrderStatus.SHIPPING,
          OrderStatus.RETURNED,
          actorId,
          `${note}: hàng hoàn về cửa hàng, cần kiểm và nhập lại kho`,
        );
        await tx.payment.updateMany({
          where: { orderId: order.id, paymentMethod: 'COD', status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });
      }

      await this.integration.shipmentChanged(tx, event);
      await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          ...(input.status === 'PICKED_UP' ? { handedOverAt: input.occurredAt } : {}),
          ...(input.status === 'DELIVERED' ? { deliveredAt: input.occurredAt } : {}),
          ...(input.status === 'DELIVERY_FAILED' ? { failedAttempts: { increment: 1 } } : {}),
        },
      });
      return { shipmentId: shipment.id, orderId: order.id, status: input.status, duplicate: false, orderStatus };
    }, TX_OPTIONS);
  }

  private async moveOrder(
    tx: Prisma.TransactionClient,
    order: { id: string; status: string },
    expected: OrderStatus,
    target: OrderStatus,
    actorId: string,
    note: string,
  ): Promise<string> {
    if (order.status !== expected) throw new ConflictException('SHIPMENT_ORDER_STATE_INVALID');
    await this.orders.applyStatusChange(tx, { orderId: order.id, target, changedBy: actorId, note });
    return target;
  }

  private creatorOf(metadata: Prisma.JsonValue): string {
    const id = (metadata as { createdBy?: string } | null)?.createdBy;
    if (!id) throw new ConflictException('SHIPMENT_CREATOR_MISSING');
    return id;
  }

  private async lockOrder(tx: Prisma.TransactionClient, orderId: string) {
    const rows = await tx.$queryRaw<{ id: string; status: string }[]>`
      SELECT id, status FROM orders WHERE id=${orderId}::uuid FOR UPDATE`;
    if (!rows.length) throw new NotFoundException('ORDER_NOT_FOUND');
    return rows[0];
  }

  private toListItem(row: ShipmentRow): ShipmentListItem {
    return {
      id: row.id,
      shipmentCode: row.shipmentCode,
      orderId: row.orderId,
      orderNumber: row.order.orderNumber,
      storeId: row.order.storeId,
      storeName: row.order.store.name,
      carrierCode: row.carrierCode,
      trackingCode: row.trackingCode,
      status: row.status,
      codAmount: Number(row.codAmount),
      shippingFeePaid: Number(row.shippingFeePaid),
      failedAttempts: row.failedAttempts,
      handedOverAt: row.handedOverAt,
      deliveredAt: row.deliveredAt,
      createdAt: row.createdAt,
    };
  }
}
