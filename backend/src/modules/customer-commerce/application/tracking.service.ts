import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';

function trackingLink(template: unknown, code: string | null) {
  if (
    typeof template !== 'string' ||
    !code ||
    !template.includes('{trackingCode}')
  )
    return null;
  try {
    const url = new URL(
      template.replace('{trackingCode}', encodeURIComponent(code)),
    );
    return url.protocol === 'https:' && !url.username && !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}
  async get(customerId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId },
      select: {
        id: true,
        status: true,
        updatedAt: true,
        shipments: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            carrierCode: true,
            trackingCode: true,
            status: true,
            handedOverAt: true,
            deliveredAt: true,
            updatedAt: true,
            events: {
              orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
              select: {
                id: true,
                status: true,
                occurredAt: true,
                receivedAt: true,
              },
            },
          },
        },
        statusHistories: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: {
            status: true,
            createdAt: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
    const configured = await this.prisma.setting.findUnique({
      where: { key: 'carrier_tracking_urls' },
    });
    const templates = configured?.value as Record<string, string> | null;
    return {
      ...order,
      shipments: order.shipments.map((shipment) => ({
        ...shipment,
        trackingUrl: trackingLink(
          templates?.[shipment.carrierCode],
          shipment.trackingCode,
        ),
      })),
    };
  }
}
