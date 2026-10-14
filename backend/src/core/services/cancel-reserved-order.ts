import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { enqueueOrderEvent } from './order-events';

/** Caller owns the order lock. All stock locks use the same ascending inventory IDs. */
export async function cancelReservedOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  reason: string,
): Promise<boolean> {
  await tx.$queryRaw`SELECT i.id FROM inventory i JOIN orders o ON o.store_id=i.store_id WHERE o.id=${orderId}::uuid
    AND i.product_variant_id IN (SELECT product_variant_id FROM order_items WHERE order_id=${orderId}::uuid) ORDER BY i.id FOR UPDATE OF i`;
  const rows = await tx.$queryRaw<{ id: string }[]>`WITH changed AS (
    UPDATE orders SET status='CANCELLED',updated_at=clock_timestamp() WHERE id=${orderId}::uuid AND status='PENDING'
    RETURNING id,store_id,customer_id,coupon_id,loyalty_points_used,order_number
  ), stock AS (
    UPDATE inventory i SET reserved_quantity=i.reserved_quantity-q.quantity,updated_at=clock_timestamp()
    FROM (SELECT c.store_id,oi.product_variant_id,SUM(oi.quantity)::int AS quantity FROM changed c JOIN order_items oi ON oi.order_id=c.id GROUP BY c.store_id,oi.product_variant_id) q
    WHERE i.store_id=q.store_id AND i.product_variant_id=q.product_variant_id
  ), usage AS (
    DELETE FROM coupon_usage u USING changed c WHERE u.order_id=c.id RETURNING u.coupon_id
  ), coupon AS (
    UPDATE coupons SET used_count=used_count-1,updated_at=clock_timestamp() WHERE id IN (SELECT coupon_id FROM usage)
  ), points AS (
    UPDATE customers cu SET total_points=cu.total_points+c.loyalty_points_used,updated_at=clock_timestamp()
    FROM changed c WHERE cu.id=c.customer_id AND c.loyalty_points_used>0
  ), loyalty AS (
    INSERT INTO loyalty_points_transactions (id,customer_id,order_id,points,type,description)
    SELECT ${randomUUID()}::uuid,customer_id,id,loyalty_points_used,'REFUND','Hoàn điểm do hủy đơn '||order_number FROM changed WHERE loyalty_points_used>0 AND customer_id IS NOT NULL
  ), payment AS (
    UPDATE payments p SET status='CANCELLED',updated_at=clock_timestamp() FROM changed c WHERE p.order_id=c.id AND p.status<>'COMPLETED'
  ), history AS (
    INSERT INTO order_status_history (id,order_id,status,note) SELECT ${randomUUID()}::uuid,id,'CANCELLED',${reason} FROM changed
  ) SELECT id FROM changed`;
  if (rows.length) await enqueueOrderEvent(tx, orderId, 'CANCELLED');
  return rows.length > 0;
}
