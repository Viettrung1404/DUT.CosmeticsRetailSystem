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
            shipmentCode: true,
            carrierCode: true,
            carrierServiceCode: true,
            trackingCode: true,
            status: true,
            trackingUrl: true,
            failedAttempts: true,
            handedOverAt: true,
            deliveredAt: true,
            updatedAt: true,
            packages: {
              select: {
                package: {
                  select: {
                    id: true,
                    packageCode: true,
                    actualWeightGrams: true,
                    items: {
                      select: {
                        quantity: true,
                        variant: {
                          select: {
                            sku: true,
                            option1Value: true,
                            option2Value: true,
                            product: {
                              select: {
                                name: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            attempts: {
              orderBy: { attemptNumber: 'asc' },
              select: {
                id: true,
                attemptNumber: true,
                attemptedAt: true,
                failureReasonCode: true,
                failureReasonDetail: true,
              },
            },
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
      shipments: order.shipments.map((shipment) => {
        const computedUrl = trackingLink(
          templates?.[shipment.carrierCode],
          shipment.trackingCode,
        );
        return {
          ...shipment,
          trackingUrl: shipment.trackingUrl || computedUrl || null,
          packages:
            shipment.packages?.map((sp) => ({
              id: sp.package.id,
              packageCode: sp.package.packageCode,
              actualWeightGrams: sp.package.actualWeightGrams,
              items:
                sp.package.items?.map((it) => {
                  const v = it.variant;
                  const variantName =
                    [v?.option1Value, v?.option2Value].filter(Boolean).join(' - ') ||
                    v?.sku ||
                    '';
                  return {
                    quantity: it.quantity,
                    productName: v?.product?.name ?? 'Sản phẩm',
                    variantName,
                  };
                }) ?? [],
            })) ?? [],
          attempts:
            shipment.attempts?.map((att) => ({
              id: att.id,
              attemptNumber: att.attemptNumber,
              attemptedAt: att.attemptedAt,
              failureReasonCode: att.failureReasonCode,
              failureReasonDetail: att.failureReasonDetail,
            })) ?? [],
        };
      }),
    };
  }
}
