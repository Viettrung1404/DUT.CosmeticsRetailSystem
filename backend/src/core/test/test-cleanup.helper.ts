import { PrismaClient } from '@prisma/client';

export interface TestCleanupEntities {
  storeIds?: string[];
  categoryIds?: string[];
  productIds?: string[];
  variantIds?: string[];
  customerIds?: string[];
  userIds?: string[];
  orderIds?: string[];
  returnOrderIds?: string[];
  shipmentIds?: string[];
  lotIds?: string[];
  dispositionIds?: string[];
  receiptIds?: string[];
  inspectionIds?: string[];
  refundIds?: string[];
  policyVersionIds?: string[];
}

/**
 * Xóa sạch các thực thể kiểm thử theo đúng thứ tự ràng buộc khóa ngoại (Foreign Key Constraints),
 * đảm bảo sau khi test hoàn tất không để lại dữ liệu rác trong cơ sở dữ liệu.
 */
export async function cleanupTestEntities(
  prisma: PrismaClient,
  entities: TestCleanupEntities,
): Promise<void> {
  const storeIds = entities.storeIds?.filter(Boolean) || [];
  const categoryIds = entities.categoryIds?.filter(Boolean) || [];
  const productIds = entities.productIds?.filter(Boolean) || [];
  const variantIds = entities.variantIds?.filter(Boolean) || [];
  const customerIds = entities.customerIds?.filter(Boolean) || [];
  const userIds = entities.userIds?.filter(Boolean) || [];
  const orderIds = entities.orderIds?.filter(Boolean) || [];
  const returnOrderIds = entities.returnOrderIds?.filter(Boolean) || [];
  const shipmentIds = entities.shipmentIds?.filter(Boolean) || [];
  const lotIds = entities.lotIds?.filter(Boolean) || [];
  const dispositionIds = entities.dispositionIds?.filter(Boolean) || [];
  const receiptIds = entities.receiptIds?.filter(Boolean) || [];
  const inspectionIds = entities.inspectionIds?.filter(Boolean) || [];
  const refundIds = entities.refundIds?.filter(Boolean) || [];
  const policyVersionIds = entities.policyVersionIds?.filter(Boolean) || [];

  const safe = async (fn: () => Promise<any>) => {
    try {
      await fn();
    } catch (e) {
      // In case entity was already deleted or not found
    }
  };

  // 0. Outbox Events matching test entities
  await safe(() =>
    prisma.outboxEvent.deleteMany({
      where: {
        OR: [
          returnOrderIds.length ? { aggregateId: { in: returnOrderIds } } : undefined,
          orderIds.length ? { aggregateId: { in: orderIds } } : undefined,
          shipmentIds.length ? { aggregateId: { in: shipmentIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  // 1. Carrier claims & abuse evaluations
  await safe(() =>
    prisma.carrierClaim.deleteMany({
      where: {
        OR: [
          returnOrderIds.length ? { returnOrderId: { in: returnOrderIds } } : undefined,
          shipmentIds.length ? { shipmentId: { in: shipmentIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.returnAbuseEvaluation.deleteMany({
      where: {
        OR: [
          returnOrderIds.length ? { returnOrderId: { in: returnOrderIds } } : undefined,
          customerIds.length ? { customerId: { in: customerIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  // 2. Packages & Shipment Packages
  await safe(() =>
    prisma.shipmentPackage.deleteMany({
      where: {
        OR: [
          shipmentIds.length ? { shipmentId: { in: shipmentIds } } : undefined,
          orderIds.length
            ? { package: { fulfillmentOrder: { orderId: { in: orderIds } } } }
            : undefined,
          storeIds.length
            ? { package: { fulfillmentOrder: { sourceLocationId: { in: storeIds } } } }
            : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.packageItem.deleteMany({
      where: {
        OR: [
          variantIds.length ? { productVariantId: { in: variantIds } } : undefined,
          orderIds.length
            ? { package: { fulfillmentOrder: { orderId: { in: orderIds } } } }
            : undefined,
          storeIds.length
            ? { package: { fulfillmentOrder: { sourceLocationId: { in: storeIds } } } }
            : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.package.deleteMany({
      where: {
        OR: [
          orderIds.length
            ? { fulfillmentOrder: { orderId: { in: orderIds } } }
            : undefined,
          storeIds.length
            ? { fulfillmentOrder: { sourceLocationId: { in: storeIds } } }
            : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  // 3. Shipments & Attempts & Events
  await safe(() =>
    prisma.shipmentEvent.deleteMany({
      where: {
        OR: [
          shipmentIds.length ? { shipmentId: { in: shipmentIds } } : undefined,
          orderIds.length ? { shipment: { orderId: { in: orderIds } } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.codReconciliationItem.deleteMany({
      where: {
        OR: [
          shipmentIds.length ? { shipmentId: { in: shipmentIds } } : undefined,
          orderIds.length ? { shipment: { orderId: { in: orderIds } } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.shipmentAttempt.deleteMany({
      where: {
        OR: [
          shipmentIds.length ? { shipmentId: { in: shipmentIds } } : undefined,
          orderIds.length ? { shipment: { orderId: { in: orderIds } } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.shipment.deleteMany({
      where: {
        OR: [
          shipmentIds.length ? { id: { in: shipmentIds } } : undefined,
          returnOrderIds.length ? { returnOrderId: { in: returnOrderIds } } : undefined,
          orderIds.length ? { orderId: { in: orderIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  // 4. Refunds & Inspections & Receipts
  await safe(() =>
    prisma.refundItem.deleteMany({
      where: {
        OR: [
          refundIds.length ? { refundId: { in: refundIds } } : undefined,
          returnOrderIds.length ? { refund: { returnOrderId: { in: returnOrderIds } } } : undefined,
          orderIds.length ? { refund: { orderId: { in: orderIds } } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.refund.deleteMany({
      where: {
        OR: [
          refundIds.length ? { id: { in: refundIds } } : undefined,
          returnOrderIds.length ? { returnOrderId: { in: returnOrderIds } } : undefined,
          orderIds.length ? { orderId: { in: orderIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.returnInspectionItem.deleteMany({
      where: {
        OR: [
          inspectionIds.length ? { inspectionId: { in: inspectionIds } } : undefined,
          returnOrderIds.length ? { inspection: { returnOrderId: { in: returnOrderIds } } } : undefined,
          returnOrderIds.length ? { returnItem: { returnOrderId: { in: returnOrderIds } } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.returnInspection.deleteMany({
      where: {
        OR: [
          inspectionIds.length ? { id: { in: inspectionIds } } : undefined,
          returnOrderIds.length ? { returnOrderId: { in: returnOrderIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.returnReceipt.deleteMany({
      where: {
        OR: [
          receiptIds.length ? { id: { in: receiptIds } } : undefined,
          returnOrderIds.length ? { returnOrderId: { in: returnOrderIds } } : undefined,
          storeIds.length ? { locationId: { in: storeIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.exchangeFunding.deleteMany({
      where: {
        OR: [
          returnOrderIds.length ? { settlement: { returnOrderId: { in: returnOrderIds } } } : undefined,
          orderIds.length ? { settlement: { replacementOrderId: { in: orderIds } } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.exchangeItem.deleteMany({
      where: {
        OR: [
          returnOrderIds.length ? { returnOrderId: { in: returnOrderIds } } : undefined,
          variantIds.length ? { newVariantId: { in: variantIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.exchangeSettlement.deleteMany({
      where: {
        OR: [
          returnOrderIds.length ? { returnOrderId: { in: returnOrderIds } } : undefined,
          orderIds.length ? { replacementOrderId: { in: orderIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.returnAttachment.deleteMany({
      where: {
        OR: [
          returnOrderIds.length ? { returnOrderId: { in: returnOrderIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.returnStatusHistory.deleteMany({
      where: {
        OR: [
          returnOrderIds.length ? { returnOrderId: { in: returnOrderIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.returnOrderItem.deleteMany({
      where: {
        OR: [
          returnOrderIds.length ? { returnOrderId: { in: returnOrderIds } } : undefined,
          variantIds.length ? { productVariantId: { in: variantIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.returnOrder.deleteMany({
      where: {
        OR: [
          returnOrderIds.length ? { id: { in: returnOrderIds } } : undefined,
          orderIds.length ? { orderId: { in: orderIds } } : undefined,
          customerIds.length ? { customerId: { in: customerIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  // 5. Orders, Fulfillment Orders, Items & Payments
  await safe(() =>
    prisma.payment.deleteMany({
      where: {
        OR: [orderIds.length ? { orderId: { in: orderIds } } : undefined].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.orderStatusHistory.deleteMany({
      where: {
        OR: [orderIds.length ? { orderId: { in: orderIds } } : undefined].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.fulfillmentOrderItem.deleteMany({
      where: {
        OR: [
          orderIds.length
            ? { fulfillmentOrder: { orderId: { in: orderIds } } }
            : undefined,
          storeIds.length
            ? { fulfillmentOrder: { sourceLocationId: { in: storeIds } } }
            : undefined,
          variantIds.length ? { productVariantId: { in: variantIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.fulfillmentOrder.deleteMany({
      where: {
        OR: [
          orderIds.length ? { orderId: { in: orderIds } } : undefined,
          storeIds.length ? { sourceLocationId: { in: storeIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.orderItemBatch.deleteMany({
      where: {
        OR: [
          orderIds.length ? { orderItem: { orderId: { in: orderIds } } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.orderItem.deleteMany({
      where: {
        OR: [
          orderIds.length ? { orderId: { in: orderIds } } : undefined,
          variantIds.length ? { productVariantId: { in: variantIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.invoiceItem.deleteMany({
      where: {
        OR: [orderIds.length ? { invoice: { orderId: { in: orderIds } } } : undefined].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.invoice.deleteMany({
      where: {
        OR: [orderIds.length ? { orderId: { in: orderIds } } : undefined].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.couponUsage.deleteMany({
      where: {
        OR: [orderIds.length ? { orderId: { in: orderIds } } : undefined].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.promotionOrderUsage.deleteMany({
      where: {
        OR: [orderIds.length ? { orderId: { in: orderIds } } : undefined].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.order.deleteMany({
      where: {
        OR: [
          orderIds.length ? { id: { in: orderIds } } : undefined,
          customerIds.length ? { customerId: { in: customerIds } } : undefined,
          storeIds.length ? { storeId: { in: storeIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  // 6. Inventory, Reservations, Lots, Dispositions
  await safe(() =>
    prisma.inventoryReservationItem.deleteMany({
      where: {
        OR: [
          variantIds.length ? { productVariantId: { in: variantIds } } : undefined,
          storeIds.length ? { reservation: { locationId: { in: storeIds } } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.inventoryReservation.deleteMany({
      where: {
        OR: [storeIds.length ? { locationId: { in: storeIds } } : undefined].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.inventoryDisposition.deleteMany({
      where: {
        OR: [
          dispositionIds.length ? { id: { in: dispositionIds } } : undefined,
          storeIds.length ? { locationId: { in: storeIds } } : undefined,
          variantIds.length ? { productVariantId: { in: variantIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.inventoryLot.deleteMany({
      where: {
        OR: [
          lotIds.length ? { id: { in: lotIds } } : undefined,
          storeIds.length ? { locationId: { in: storeIds } } : undefined,
          variantIds.length ? { productVariantId: { in: variantIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.inventoryTransaction.deleteMany({
      where: {
        OR: [
          storeIds.length ? { storeId: { in: storeIds } } : undefined,
          variantIds.length ? { productVariantId: { in: variantIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.inventory.deleteMany({
      where: {
        OR: [
          storeIds.length ? { storeId: { in: storeIds } } : undefined,
          variantIds.length ? { productVariantId: { in: variantIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  // 7. Cart & Batches & Variants & Products & Categories
  await safe(() =>
    prisma.cartItem.deleteMany({
      where: {
        OR: [variantIds.length ? { productVariantId: { in: variantIds } } : undefined].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.batch.deleteMany({
      where: {
        OR: [
          storeIds.length ? { storeId: { in: storeIds } } : undefined,
          variantIds.length ? { productVariantId: { in: variantIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.productVariant.deleteMany({
      where: {
        OR: [
          variantIds.length ? { id: { in: variantIds } } : undefined,
          productIds.length ? { productId: { in: productIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.productImage.deleteMany({
      where: {
        OR: [productIds.length ? { productId: { in: productIds } } : undefined].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.productTag.deleteMany({
      where: {
        OR: [productIds.length ? { productId: { in: productIds } } : undefined].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.product.deleteMany({
      where: {
        OR: [
          productIds.length ? { id: { in: productIds } } : undefined,
          categoryIds.length ? { categoryId: { in: categoryIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.category.deleteMany({
      where: {
        OR: [categoryIds.length ? { id: { in: categoryIds } } : undefined].filter(Boolean) as any,
      },
    }),
  );

  // 8. Stores & Users & Customers
  await safe(() =>
    prisma.shippingQuote.deleteMany({
      where: {
        OR: [storeIds.length ? { sourceLocationId: { in: storeIds } } : undefined].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.posSession.deleteMany({
      where: {
        OR: [storeIds.length ? { storeId: { in: storeIds } } : undefined].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.userStore.deleteMany({
      where: {
        OR: [storeIds.length ? { storeId: { in: storeIds } } : undefined].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.loyaltyPointsTransaction.deleteMany({
      where: {
        OR: [customerIds.length ? { customerId: { in: customerIds } } : undefined].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.customerAddress.deleteMany({
      where: {
        OR: [customerIds.length ? { customerId: { in: customerIds } } : undefined].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.wishlist.deleteMany({
      where: {
        OR: [
          customerIds.length ? { customerId: { in: customerIds } } : undefined,
          variantIds.length ? { productVariantId: { in: variantIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.review.deleteMany({
      where: {
        OR: [
          customerIds.length ? { customerId: { in: customerIds } } : undefined,
          productIds.length ? { productId: { in: productIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.cart.deleteMany({
      where: {
        OR: [customerIds.length ? { customerId: { in: customerIds } } : undefined].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.customer.deleteMany({
      where: {
        OR: [
          customerIds.length ? { id: { in: customerIds } } : undefined,
          userIds.length ? { userId: { in: userIds } } : undefined,
        ].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.user.deleteMany({
      where: {
        OR: [userIds.length ? { id: { in: userIds } } : undefined].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.store.deleteMany({
      where: {
        OR: [storeIds.length ? { id: { in: storeIds } } : undefined].filter(Boolean) as any,
      },
    }),
  );

  await safe(() =>
    prisma.returnPolicyVersion.deleteMany({
      where: {
        OR: [policyVersionIds.length ? { id: { in: policyVersionIds } } : undefined].filter(Boolean) as any,
      },
    }),
  );
}

/**
 * Tự động tìm và dọn dẹp toàn bộ dữ liệu kiểm thử dựa trên testSuffix/pattern
 */
export async function cleanupTestDataByPattern(
  prisma: PrismaClient,
  pattern: string,
): Promise<void> {
  if (!pattern || pattern.length < 3) return;

  const [stores, categories, products, variants, users, customers, orders, returns, shipments, lots, dispositions] =
    await Promise.all([
      prisma.store.findMany({
        where: { OR: [{ code: { contains: pattern } }, { name: { contains: pattern } }] },
        select: { id: true },
      }),
      prisma.category.findMany({
        where: { OR: [{ slug: { contains: pattern } }, { name: { contains: pattern } }] },
        select: { id: true },
      }),
      prisma.product.findMany({
        where: { OR: [{ sku: { contains: pattern } }, { name: { contains: pattern } }] },
        select: { id: true },
      }),
      prisma.productVariant.findMany({
        where: { sku: { contains: pattern } },
        select: { id: true },
      }),
      prisma.user.findMany({
        where: { OR: [{ email: { contains: pattern } }, { fullName: { contains: pattern } }] },
        select: { id: true },
      }),
      prisma.customer.findMany({
        where: { fullName: { contains: pattern } },
        select: { id: true },
      }),
      prisma.order.findMany({
        where: { orderNumber: { contains: pattern } },
        select: { id: true },
      }),
      prisma.returnOrder.findMany({
        where: { returnCode: { contains: pattern } },
        select: { id: true },
      }),
      prisma.shipment.findMany({
        where: { OR: [{ shipmentCode: { contains: pattern } }, { trackingCode: { contains: pattern } }] },
        select: { id: true },
      }),
      prisma.inventoryLot.findMany({
        where: { batchCode: { contains: pattern } },
        select: { id: true },
      }),
      prisma.inventoryDisposition.findMany({
        where: { dispositionCode: { contains: pattern } },
        select: { id: true },
      }),
    ]);

  await cleanupTestEntities(prisma, {
    storeIds: stores.map((s) => s.id),
    categoryIds: categories.map((c) => c.id),
    productIds: products.map((p) => p.id),
    variantIds: variants.map((v) => v.id),
    userIds: users.map((u) => u.id),
    customerIds: customers.map((c) => c.id),
    orderIds: orders.map((o) => o.id),
    returnOrderIds: returns.map((r) => r.id),
    shipmentIds: shipments.map((s) => s.id),
    lotIds: lots.map((l) => l.id),
    dispositionIds: dispositions.map((d) => d.id),
  });
}
