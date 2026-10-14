import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
const titles: Record<string, string> = {
  PENDING: 'Đã nhận đơn hàng',
  CONFIRMED: 'Đơn hàng đã xác nhận',
  SHIPPING: 'Đơn hàng đang giao',
  DELIVERED: 'Đơn hàng đã giao',
  CANCELLED: 'Đơn hàng đã hủy',
  REFUND_PENDING: 'Đã ghi nhận yêu cầu hoàn tiền',
};
/** Durable writes only. Call in the order transaction, without SMTP or HTTP. */
export async function enqueueOrderEvent(
  tx: Prisma.TransactionClient,
  orderId: string,
  status: string,
  suffix = '',
): Promise<void> {
  if (!titles[status]) return;
  const eventKey = `ORDER:${orderId}:${status}${suffix ? `:${suffix}` : ''}`;
  const title = titles[status];
  const message =
    status === 'REFUND_PENDING'
      ? 'Đã ghi nhận tiền; yêu cầu hoàn tiền đang chờ xử lý. Liên hệ Việt Trung trong giai đoạn demo.'
      : title;
  await tx.$executeRaw`WITH owner AS (
    SELECT u.id,u.email,o.order_number FROM orders o JOIN customers c ON c.id=o.customer_id JOIN users u ON u.id=c.user_id WHERE o.id=${orderId}::uuid
  ), notification AS (
    INSERT INTO notifications (id,user_id,event_key,title,message,type,data)
    SELECT ${randomUUID()}::uuid,id,${eventKey},${title},${message}||' '||order_number,'ORDER',${JSON.stringify({ orderId, status })}::jsonb FROM owner
    ON CONFLICT(event_key) DO NOTHING
  ) INSERT INTO email_outbox (id,user_id,event_key,recipient,subject,text)
    SELECT ${randomUUID()}::uuid,id,${eventKey},email,${title},${message}||' '||order_number FROM owner ON CONFLICT(event_key) DO NOTHING`;
}
